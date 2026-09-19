import { useState, useRef } from 'react';

const toDataUrl = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

const loadImg = (src) =>
  new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

const fmtSize = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

const canvasBlob = (canvas, mime, q) =>
  new Promise((res) => {
    if (q !== undefined) {
      canvas.toBlob((blob) => res(blob), mime, q);
    } else {
      canvas.toBlob((blob) => res(blob), mime);
    }
  });

// High-quality step-down canvas resizing to preserve crisp text and sharp details
function getSharplyScaledCanvas(img, targetWidth, targetHeight) {
  let currentW = img.width;
  let currentH = img.height;

  let currentCanvas = document.createElement('canvas');
  currentCanvas.width = currentW;
  currentCanvas.height = currentH;
  let ctx = currentCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, currentW, currentH);

  // If scaling down by more than 2x, step down in halves to avoid aliasing and blur
  while (currentW * 0.5 > targetWidth && currentH * 0.5 > targetHeight) {
    currentW = Math.round(currentW * 0.5);
    currentH = Math.round(currentH * 0.5);
    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = currentW;
    nextCanvas.height = currentH;
    const nextCtx = nextCanvas.getContext('2d');
    nextCtx.imageSmoothingEnabled = true;
    nextCtx.imageSmoothingQuality = 'high';
    nextCtx.drawImage(currentCanvas, 0, 0, currentW, currentH);
    currentCanvas = nextCanvas;
  }

  // Final draw to exact dimensions
  if (currentW !== targetWidth || currentH !== targetHeight) {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(currentCanvas, 0, 0, targetWidth, targetHeight);
    return finalCanvas;
  }

  return currentCanvas;
}

export default function ImageTool() {
  // ── Modal zoom state ──────────────────────────────────────────────────────
  const [modalImage, setModalImage] = useState(null); // url string

  // ── Resize state ──────────────────────────────────────────────────────────
  const [resizeFile,    setResizeFile]    = useState(null);
  const [resizeW,       setResizeW]       = useState(1200);
  const [resizeH,       setResizeH]       = useState(800);
  const [keepW,         setKeepW]         = useState(true);
  const [keepH,         setKeepH]         = useState(true);
  const [resizePreview, setResizePreview] = useState(null);
  const [resizeMeta,    setResizeMeta]    = useState(null); // { w, h, size }
  const [resizeStatus,  setResizeStatus]  = useState({ text: 'Ready to resize.', ok: true });
  const resizedCanvas = useRef(null);

  // ── Reducer state ─────────────────────────────────────────────────────────
  const [redFile,       setRedFile]       = useState(null);
  const [targetKB,      setTargetKB]      = useState(250);
  const [outFormat,     setOutFormat]     = useState('image/jpeg');
  const [redStatus,     setRedStatus]     = useState({ text: 'Ready to optimize.', ok: true });
  const [redPreview,    setRedPreview]    = useState(null);
  const [redMeta,       setRedMeta]       = useState(null); // { label, w, h, size }
  const redBlob = useRef(null);

  // ── File selection handlers (immediate preview) ───────────────────────────
  const handleResizeFileSelect = async (file) => {
    setResizeFile(file);
    if (!file) {
      setResizePreview(null);
      setResizeMeta(null);
      return;
    }
    try {
      const dataUrl = await toDataUrl(file);
      const img = await loadImg(dataUrl);
      setResizeW(img.width);
      setResizeH(img.height);
      setResizePreview(dataUrl);
      setResizeMeta({ label: 'Original', w: img.width, h: img.height, size: fmtSize(file.size) });
      setResizeStatus({ text: `Loaded: ${img.width} × ${img.height} px (${fmtSize(file.size)})`, ok: true });
    } catch {
      setResizeStatus({ text: 'Could not read image.', ok: false });
    }
  };

  const handleRedFileSelect = async (file) => {
    setRedFile(file);
    if (!file) {
      setRedPreview(null);
      setRedMeta(null);
      return;
    }
    try {
      const dataUrl = await toDataUrl(file);
      const img = await loadImg(dataUrl);
      setRedPreview(dataUrl);
      setRedMeta({ label: 'Original Preview', w: img.width, h: img.height, size: fmtSize(file.size) });
      setRedStatus({ text: `Loaded: ${img.width} × ${img.height} px (${fmtSize(file.size)}). Ready to optimize.`, ok: true });
    } catch {
      setRedStatus({ text: 'Could not read image.', ok: false });
    }
  };

  // ── Resize handlers ───────────────────────────────────────────────────────
  const handleResize = async () => {
    if (!resizeFile) {
      setResizeStatus({ text: 'Please choose an image first.', ok: false });
      return;
    }
    try {
      const dataUrl = await toDataUrl(resizeFile);
      const img     = await loadImg(dataUrl);
      const w = keepW ? img.width  : Math.max(1, Number(resizeW));
      const h = keepH ? img.height : Math.max(1, Number(resizeH));
      const canvas = getSharplyScaledCanvas(img, w, h);
      resizedCanvas.current = canvas;
      const previewUrl = canvas.toDataURL('image/png');
      setResizePreview(previewUrl);
      setResizeMeta({ label: 'Resized', w, h, size: 'Ready to download' });
      setResizeStatus({ text: `✓ Resized to ${w} × ${h} px`, ok: true });
    } catch {
      setResizeStatus({ text: 'Failed to resize image.', ok: false });
    }
  };

  const handleDownloadResized = () => {
    const c = resizedCanvas.current;
    if (!c) return;
    const a = Object.assign(document.createElement('a'), {
      href: c.toDataURL('image/png'),
      download: 'resized.png',
    });
    a.click();
  };

  // ── High-Quality Document & Photo Image Reducer ────────────────────────────
  const handleOptimize = async () => {
    if (!redFile) {
      setRedStatus({ text: 'Please choose an image first.', ok: false });
      return;
    }
    const targetKbNum = Math.max(1, Number(targetKB) || 250);
    const targetBytes = targetKbNum * 1024;
    setRedStatus({ text: 'Optimizing while preserving maximum quality & text clarity…', ok: true });

    try {
      const dataUrl = await toDataUrl(redFile);
      const img     = await loadImg(dataUrl);
      const origW   = img.width;
      const origH   = img.height;

      let bestBlob = null;
      let finalDimensions = { w: origW, h: origH };
      let resolutionPreserved = true;

      if (outFormat === 'image/png') {
        // PNG is lossless in canvas, so file size reduction requires scaling dimensions
        let lowScale = 0.05;
        let highScale = 1.0;

        for (let i = 0; i < 9; i++) {
          const midScale = (lowScale + highScale) / 2;
          const w = Math.max(1, Math.round(origW * midScale));
          const h = Math.max(1, Math.round(origH * midScale));
          const canvas = getSharplyScaledCanvas(img, w, h);
          const blob = await canvasBlob(canvas, 'image/png');

          if (blob && blob.size <= targetBytes) {
            bestBlob = blob;
            finalDimensions = { w, h };
            lowScale = midScale; // try higher resolution
          } else {
            highScale = midScale; // reduce resolution
          }
        }

        if (!bestBlob) {
          const w = Math.max(1, Math.round(origW * 0.05));
          const h = Math.max(1, Math.round(origH * 0.05));
          const canvas = getSharplyScaledCanvas(img, w, h);
          bestBlob = await canvasBlob(canvas, 'image/png');
          finalDimensions = { w, h };
        }
        resolutionPreserved = (finalDimensions.w === origW && finalDimensions.h === origH);
      } else {
        // JPEG / WEBP: Priority 1 is PRESERVING 100% ORIGINAL RESOLUTION (width & height)
        // High resolution preserves fine letter edges and document text legibility!
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = origW;
        fullCanvas.height = origH;
        const fullCtx = fullCanvas.getContext('2d');
        fullCtx.imageSmoothingEnabled = true;
        fullCtx.imageSmoothingQuality = 'high';
        fullCtx.drawImage(img, 0, 0, origW, origH);

        // Check if max quality (0.98) already fits under target size
        const maxBlob = await canvasBlob(fullCanvas, outFormat, 0.98);
        if (maxBlob && maxBlob.size <= targetBytes) {
          bestBlob = maxBlob;
          finalDimensions = { w: origW, h: origH };
        } else {
          // Check if quality between 0.45 and 0.98 at 100% resolution fits
          const minAcceptableBlob = await canvasBlob(fullCanvas, outFormat, 0.45);
          if (minAcceptableBlob && minAcceptableBlob.size <= targetBytes) {
            // Binary search 14 steps for the optimal quality at 100% original resolution
            let lowQ = 0.45;
            let highQ = 0.98;
            bestBlob = minAcceptableBlob;

            for (let step = 0; step < 14; step++) {
              const midQ = (lowQ + highQ) / 2;
              const testBlob = await canvasBlob(fullCanvas, outFormat, midQ);
              if (testBlob && testBlob.size <= targetBytes) {
                bestBlob = testBlob;
                lowQ = midQ; // try higher quality
              } else {
                highQ = midQ;
              }
            }
            finalDimensions = { w: origW, h: origH };
          } else {
            // Only if even 45% quality at full resolution exceeds target, gently step down resolution
            resolutionPreserved = false;
            const candidateScales = [0.92, 0.85, 0.78, 0.70, 0.62, 0.55, 0.45, 0.35];

            for (const scale of candidateScales) {
              const w = Math.max(1, Math.round(origW * scale));
              const h = Math.max(1, Math.round(origH * scale));
              const canvas = getSharplyScaledCanvas(img, w, h);

              const checkBlob = await canvasBlob(canvas, outFormat, 0.55);
              if (checkBlob && checkBlob.size <= targetBytes) {
                // Found resolution scale that fits with readable quality; binary search quality
                let lowQ = 0.55;
                let highQ = 0.95;
                bestBlob = checkBlob;

                for (let step = 0; step < 12; step++) {
                  const midQ = (lowQ + highQ) / 2;
                  const testBlob = await canvasBlob(canvas, outFormat, midQ);
                  if (testBlob && testBlob.size <= targetBytes) {
                    bestBlob = testBlob;
                    lowQ = midQ;
                  } else {
                    highQ = midQ;
                  }
                }
                finalDimensions = { w, h };
                break;
              }
            }

            if (!bestBlob) {
              const w = Math.max(1, Math.round(origW * 0.25));
              const h = Math.max(1, Math.round(origH * 0.25));
              const canvas = getSharplyScaledCanvas(img, w, h);
              bestBlob = await canvasBlob(canvas, outFormat, 0.50);
              finalDimensions = { w, h };
            }
          }
        }
      }

      if (!bestBlob) {
        throw new Error('Could not optimize image to target size.');
      }

      redBlob.current = bestBlob;
      if (redPreview) URL.revokeObjectURL(redPreview);
      const previewUrl = URL.createObjectURL(bestBlob);
      setRedPreview(previewUrl);

      const achievedKb = (bestBlob.size / 1024).toFixed(1);
      const originalKb = (redFile.size / 1024).toFixed(1);

      setRedMeta({
        label: 'Optimized Preview',
        w: finalDimensions.w,
        h: finalDimensions.h,
        size: `${achievedKb} KB`,
      });

      let statusMsg = `✓ Optimized: ${achievedKb} KB (Target: ${targetKbNum} KB | Original: ${originalKb} KB). `;
      if (resolutionPreserved) {
        statusMsg += `Full 100% resolution preserved (${finalDimensions.w} × ${finalDimensions.h} px) for maximum sharpness.`;
      } else {
        statusMsg += `Resolution: ${finalDimensions.w} × ${finalDimensions.h} px (downscaled to fit target).`;
      }

      if (outFormat === 'image/png' && !resolutionPreserved) {
        statusMsg += ' Tip: Switch to JPG/JPEG to preserve 100% full resolution and clearer text.';
      }

      setRedStatus({ text: statusMsg, ok: true });
    } catch (err) {
      setRedStatus({ text: err.message || 'Failed to optimize image.', ok: false });
    }
  };

  const handleDownloadOptimized = () => {
    const blob = redBlob.current;
    if (!blob) return;
    const ext = outFormat === 'image/png' ? 'png' : outFormat === 'image/webp' ? 'webp' : 'jpg';
    const originalName = redFile?.name ? redFile.name.replace(/\.[^.]+$/, '') : 'optimized';
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${originalName}-optimized.${ext}`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="section-header"><h2>Image tools</h2></div>

      {/* ── Fullscreen Zoom Modal ────────────────────────────────────────── */}
      {modalImage && (
        <div className="preview-modal-overlay" onClick={() => setModalImage(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="preview-modal-close"
              type="button"
              onClick={() => setModalImage(null)}
            >
              ✕ Close
            </button>
            <img src={modalImage} alt="Full resolution inspection" />
          </div>
        </div>
      )}

      <div className="tool-grid">
        {/* ── Image resize ────────────────────────────────────────────────── */}
        <div className="mini-card">
          <h3>Image resize</h3>
          <div className="upload-box">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleResizeFileSelect(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="resize-controls">
            <div className="input-pair">
              <label>Width (px)</label>
              <input
                type="number"
                value={resizeW}
                min="1"
                onChange={(e) => setResizeW(e.target.value)}
              />
            </div>
            <div className="input-pair">
              <label>Height (px)</label>
              <input
                type="number"
                value={resizeH}
                min="1"
                onChange={(e) => setResizeH(e.target.value)}
              />
            </div>
          </div>

          <div className="resize-controls">
            <div className="input-pair checkbox-pair">
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={keepW}
                  onChange={(e) => setKeepW(e.target.checked)}
                />
                Retain original width
              </label>
            </div>
            <div className="input-pair checkbox-pair">
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={keepH}
                  onChange={(e) => setKeepH(e.target.checked)}
                />
                Retain original height
              </label>
            </div>
          </div>

          <div className="action-row compact">
            <button className="primary-button small" type="button" onClick={handleResize}>
              Resize
            </button>
            <button className="secondary-button small" type="button" onClick={handleDownloadResized}>
              Download
            </button>
          </div>

          <div className={`resize-preview-wrap${resizePreview ? ' has-image' : ''}`}>
            {resizePreview && (
              <>
                <img id="resize-preview" src={resizePreview} alt="Resized preview" />
                {resizeMeta && (
                  <div className="preview-meta-bar">
                    <span>
                      <strong>{resizeMeta.label}</strong>: {resizeMeta.w} × {resizeMeta.h} px ({resizeMeta.size})
                    </span>
                    <button
                      className="preview-zoom-btn"
                      type="button"
                      onClick={() => setModalImage(resizePreview)}
                    >
                      🔍 Full View
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <div id="resize-status" className={`result-box ${resizeStatus.ok ? 'success' : 'error'}`}>
            {resizeStatus.text}
          </div>
        </div>

        {/* ── Image size reducer ───────────────────────────────────────────── */}
        <div className="mini-card">
          <h3>Image size reducer</h3>
          <div className="upload-box">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleRedFileSelect(e.target.files?.[0] ?? null)}
            />
          </div>

          <label>
            Target file size (KB)
            <input
              type="number"
              min="1"
              step="1"
              value={targetKB}
              onChange={(e) => setTargetKB(e.target.value)}
            />
          </label>
          <label>
            Output format
            <select value={outFormat} onChange={(e) => setOutFormat(e.target.value)}>
              <option value="image/jpeg">JPG / JPEG (Best for documents &amp; photos)</option>
              <option value="image/webp">WEBP (Modern web format)</option>
              <option value="image/png">PNG (Lossless, larger file size)</option>
            </select>
          </label>

          {outFormat === 'image/png' && (
            <p style={{ fontSize: '0.78rem', color: 'var(--amber)', margin: '4px 0 10px 0', lineHeight: 1.4 }}>
              💡 Tip: PNG is lossless. For text documents and receipts, JPG/JPEG preserves 100% full resolution and crystal-clear text at 250 KB.
            </p>
          )}

          <div className="action-row compact">
            <button className="primary-button small" type="button" onClick={handleOptimize}>
              Optimize
            </button>
            <button className="secondary-button small" type="button" onClick={handleDownloadOptimized}>
              Download
            </button>
          </div>

          <div className={`result-box ${redStatus.ok ? 'success' : 'error'}`}>
            {redStatus.text}
          </div>

          <div className={`resize-preview-wrap${redPreview ? ' has-image' : ''}`} id="image-size-preview-wrap">
            {redPreview && (
              <>
                <img id="image-size-preview" src={redPreview} alt="Optimized preview" />
                {redMeta && (
                  <div className="preview-meta-bar">
                    <span>
                      <strong>{redMeta.label}</strong>: {redMeta.w} × {redMeta.h} px ({redMeta.size})
                    </span>
                    <button
                      className="preview-zoom-btn"
                      type="button"
                      onClick={() => setModalImage(redPreview)}
                    >
                      🔍 Full View
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
