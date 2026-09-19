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

export default function ImageTool() {
  // ── Resize state ──────────────────────────────────────────────────────────
  const [resizeFile,    setResizeFile]    = useState(null);
  const [resizeW,       setResizeW]       = useState(1200);
  const [resizeH,       setResizeH]       = useState(800);
  const [keepW,         setKeepW]         = useState(true);
  const [keepH,         setKeepH]         = useState(true);
  const [resizePreview, setResizePreview] = useState(null);
  const [resizeStatus,  setResizeStatus]  = useState({ text: 'Ready to resize.', ok: true });
  const resizedCanvas = useRef(null);

  // ── Reducer state ─────────────────────────────────────────────────────────
  const [redFile,       setRedFile]       = useState(null);
  const [targetKB,      setTargetKB]      = useState(250);
  const [outFormat,     setOutFormat]     = useState('image/jpeg');
  const [redStatus,     setRedStatus]     = useState({ text: 'Ready to optimize.', ok: true });
  const [redPreview,    setRedPreview]    = useState(null);
  const redBlob = useRef(null);

  // ── Resize handlers ───────────────────────────────────────────────────────
  const handleResize = async () => {
    if (!resizeFile) {
      setResizeStatus({ text: 'Please choose an image first.', ok: false });
      return;
    }
    try {
      const dataUrl = await toDataUrl(resizeFile);
      const img     = await loadImg(dataUrl);
      const w = keepW ? img.width  : Number(resizeW);
      const h = keepH ? img.height : Number(resizeH);
      const canvas  = Object.assign(document.createElement('canvas'), { width: w, height: h });
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resizedCanvas.current = canvas;
      setResizePreview(canvas.toDataURL('image/png'));
      setResizeStatus({ text: `Resized to ${w} × ${h} px`, ok: true });
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

  // ── High-precision Reducer handler ────────────────────────────────────────
  const handleOptimize = async () => {
    if (!redFile) {
      setRedStatus({ text: 'Please choose an image first.', ok: false });
      return;
    }
    const targetKbNum = Math.max(1, Number(targetKB) || 250);
    const targetBytes = targetKbNum * 1024;
    setRedStatus({ text: 'Optimizing to target size…', ok: true });

    try {
      const dataUrl = await toDataUrl(redFile);
      const img     = await loadImg(dataUrl);

      let bestBlob = null;

      if (outFormat === 'image/png') {
        // PNG is lossless in canvas, so binary-search image scale to fit target size
        let lowScale = 0.05;
        let highScale = 1.0;

        for (let i = 0; i < 9; i++) {
          const midScale = (lowScale + highScale) / 2;
          const w = Math.max(1, Math.round(img.width * midScale));
          const h = Math.max(1, Math.round(img.height * midScale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const blob = await canvasBlob(canvas, 'image/png');

          if (blob && blob.size <= targetBytes) {
            bestBlob = blob;
            lowScale = midScale; // try higher resolution
          } else {
            highScale = midScale; // reduce resolution
          }
        }

        if (!bestBlob) {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * 0.05));
          canvas.height = Math.max(1, Math.round(img.height * 0.05));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          bestBlob = await canvasBlob(canvas, 'image/png');
        }
      } else {
        // JPEG / WEBP: High-precision binary search on quality (0.01 to 1.0)
        let currentScale = 1.0;
        let foundFit = false;

        // Try at current scale; if even min quality is too large, step down resolution
        while (currentScale >= 0.1 && !foundFit) {
          const w = Math.max(1, Math.round(img.width * currentScale));
          const h = Math.max(1, Math.round(img.height * currentScale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);

          // Check max quality first
          const maxBlob = await canvasBlob(canvas, outFormat, 0.99);
          if (maxBlob && maxBlob.size <= targetBytes) {
            bestBlob = maxBlob;
            foundFit = true;
            break;
          }

          // Check min quality
          const minBlob = await canvasBlob(canvas, outFormat, 0.02);
          if (minBlob && minBlob.size <= targetBytes) {
            // Binary search 14 steps for exact quality
            let lowQ = 0.02;
            let highQ = 0.99;
            bestBlob = minBlob;

            for (let step = 0; step < 14; step++) {
              const midQ = (lowQ + highQ) / 2;
              const testBlob = await canvasBlob(canvas, outFormat, midQ);
              if (testBlob && testBlob.size <= targetBytes) {
                bestBlob = testBlob;
                lowQ = midQ; // try higher quality to get closer to target
              } else {
                highQ = midQ; // too large, reduce quality
              }
            }
            foundFit = true;
            break;
          }

          // Even lowest quality exceeds target at this resolution -> scale down
          currentScale *= 0.75;
        }

        if (!bestBlob) {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * 0.1));
          canvas.height = Math.max(1, Math.round(img.height * 0.1));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          bestBlob = await canvasBlob(canvas, outFormat, 0.05);
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

      if (redFile.size <= targetBytes && bestBlob.size <= redFile.size) {
        setRedStatus({
          text: `Optimized: ${fmtSize(bestBlob.size)} (Original ${originalKb} KB was already ≤ target ${targetKbNum} KB)`,
          ok: true,
        });
      } else {
        setRedStatus({
          text: `Optimized: ${achievedKb} KB (Target: ${targetKbNum} KB, Original: ${originalKb} KB)`,
          ok: true,
        });
      }
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
      download: `${originalName}-reduced.${ext}`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="section-header"><h2>Image tools</h2></div>

      <div className="tool-grid">
        {/* ── Image resize ────────────────────────────────────────────────── */}
        <div className="mini-card">
          <h3>Image resize</h3>
          <div className="upload-box">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setResizeFile(e.target.files?.[0] ?? null)}
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
              <img id="resize-preview" src={resizePreview} alt="Resized preview" />
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
              onChange={(e) => setRedFile(e.target.files?.[0] ?? null)}
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
              <option value="image/jpeg">JPG / JPEG</option>
              <option value="image/png">PNG</option>
              <option value="image/webp">WEBP</option>
            </select>
          </label>

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

          {redPreview && (
            <div className="resize-preview-wrap has-image" id="image-size-preview-wrap">
              <img id="image-size-preview" src={redPreview} alt="Optimized preview" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
