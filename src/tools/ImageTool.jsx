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
  new Promise((res) => canvas.toBlob(res, mime, q));

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
    if (!resizeFile) { setResizeStatus({ text: 'Please choose an image first.', ok: false }); return; }
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
    const a = Object.assign(document.createElement('a'), { href: c.toDataURL('image/png'), download: 'resized.png' });
    a.click();
  };

  // ── Reducer handlers ──────────────────────────────────────────────────────
  const handleOptimize = async () => {
    if (!redFile) { setRedStatus({ text: 'Please choose an image first.', ok: false }); return; }
    setRedStatus({ text: 'Optimizing…', ok: true });
    try {
      const dataUrl = await toDataUrl(redFile);
      const img     = await loadImg(dataUrl);
      const canvas  = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
      canvas.getContext('2d').drawImage(img, 0, 0);

      const target = Number(targetKB) * 1024;
      let blob = null;
      for (const q of [0.95, 0.85, 0.75, 0.6, 0.45, 0.3, 0.15, 0.05]) {
        blob = await canvasBlob(canvas, outFormat, q);
        if (blob && blob.size <= target) break;
      }
      if (!blob) blob = await canvasBlob(canvas, outFormat, 0.5);
      redBlob.current = blob;
      if (redPreview) URL.revokeObjectURL(redPreview);
      setRedPreview(URL.createObjectURL(blob));
      setRedStatus({ text: `Optimized: ${fmtSize(blob.size)}`, ok: true });
    } catch {
      setRedStatus({ text: 'Failed to optimize image.', ok: false });
    }
  };

  const handleDownloadOptimized = () => {
    const blob = redBlob.current;
    if (!blob) return;
    const ext = outFormat.split('/')[1].replace('jpeg', 'jpg');
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `optimized.${ext}` }).click();
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
            <input type="file" accept="image/*" onChange={(e) => setResizeFile(e.target.files?.[0] ?? null)} />
          </div>

          <div className="resize-controls">
            <div className="input-pair">
              <label>Width</label>
              <input type="number" value={resizeW} min="1" onChange={(e) => setResizeW(e.target.value)} />
            </div>
            <div className="input-pair">
              <label>Height</label>
              <input type="number" value={resizeH} min="1" onChange={(e) => setResizeH(e.target.value)} />
            </div>
          </div>

          <div className="resize-controls">
            <div className="input-pair checkbox-pair">
              <label className="checkbox-inline">
                <input type="checkbox" checked={keepW} onChange={(e) => setKeepW(e.target.checked)} />
                Retain original width
              </label>
            </div>
            <div className="input-pair checkbox-pair">
              <label className="checkbox-inline">
                <input type="checkbox" checked={keepH} onChange={(e) => setKeepH(e.target.checked)} />
                Retain original height
              </label>
            </div>
          </div>

          <div className="action-row compact">
            <button className="primary-button small" type="button" onClick={handleResize}>Resize</button>
            <button className="secondary-button small" type="button" onClick={handleDownloadResized}>Download</button>
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
            <input type="file" accept="image/*" onChange={(e) => setRedFile(e.target.files?.[0] ?? null)} />
          </div>

          <label>Final size (KB)
            <input type="number" min="1" step="1" value={targetKB} onChange={(e) => setTargetKB(e.target.value)} />
          </label>
          <label>Output format
            <select value={outFormat} onChange={(e) => setOutFormat(e.target.value)}>
              <option value="image/jpeg">JPG / JPEG</option>
              <option value="image/png">PNG</option>
              <option value="image/webp">WEBP</option>
            </select>
          </label>

          <div className="action-row compact">
            <button className="primary-button small" type="button" onClick={handleOptimize}>Optimize</button>
            <button className="secondary-button small" type="button" onClick={handleDownloadOptimized}>Download</button>
          </div>

          <div className={`result-box ${redStatus.ok ? 'success' : 'error'}`}>{redStatus.text}</div>

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
