import { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';

const isImage = (f) => f && (f.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name));

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

const getPdfFormat = (file) => {
  const t = file.type || '';
  if (t === 'image/png') return 'PNG';
  if (t === 'image/webp') return 'WEBP';
  return 'JPEG';
};

export default function PdfStudioTool() {
  const [images, setImages]   = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [status, setStatus]   = useState({ text: '', ok: true });
  const inputRef              = useRef(null);

  const loadFiles = async (files) => {
    const valid = Array.from(files).filter(isImage);
    if (!valid.length) return;
    const loaded = await Promise.all(
      valid.map(async (f) => {
        const dataUrl = await toDataUrl(f);
        const img = await loadImg(dataUrl);
        return { file: f, name: f.name, dataUrl, width: img.width, height: img.height };
      })
    );
    setImages((prev) => [...prev, ...loaded]);
    setStatus({ text: `${loaded.length} image(s) added. Rearrange order below if needed.`, ok: true });
  };

  // Drag & drop handlers (desktop)
  const handleDrop = (toIdx) => {
    if (dragIdx === null || dragIdx === toIdx) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDragIdx(null);
  };

  // Touch-friendly move buttons (mobile & desktop)
  const moveUp = (index) => {
    if (index <= 0) return;
    setImages((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const moveDown = (index) => {
    if (index >= images.length - 1) return;
    setImages((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setImages([]);
    if (inputRef.current) inputRef.current.value = '';
    setStatus({ text: 'All images cleared.', ok: true });
  };

  const generatePdf = async () => {
    if (!images.length) return;
    setStatus({ text: 'Generating high-quality PDF…', ok: true });

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();

      for (let i = 0; i < images.length; i++) {
        const { dataUrl, file, width, height } = images[i];
        if (i > 0) doc.addPage();
        const ratio = Math.min(pw / width, ph / height) * 0.9;
        const w = width * ratio;
        const h = height * ratio;
        doc.addImage(dataUrl, getPdfFormat(file), (pw - w) / 2, (ph - h) / 2, w, h, undefined, 'SLOW');
      }

      doc.save('notjustpdf-images.pdf');
      setStatus({ text: `✓ Generated ${images.length}-page PDF successfully!`, ok: true });
    } catch {
      setStatus({ text: 'Failed to generate PDF.', ok: false });
    }
  };

  return (
    <div className="card">
      <div className="section-header">
        <h2>PDF Studio</h2>
        <div className="status-badge success">Browser-first</div>
      </div>

      <div className="tool-grid">
        <div className="mini-card" style={{ gridColumn: '1 / -1' }}>
          <h3>Image to PDF</h3>
          <div className="upload-box">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => loadFiles(e.target.files)}
            />
          </div>

          {images.length > 0 && (
            <div className="order-controls">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ margin: 0 }}>
                  Page Order ({images.length} page{images.length === 1 ? '' : 's'})
                </label>
                <button
                  className="secondary-button small"
                  type="button"
                  onClick={clearAll}
                  style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                >
                  Clear all
                </button>
              </div>

              <div className="order-list">
                {images.map((img, i) => (
                  <div
                    key={img.name + i + 'o'}
                    className={`image-order-item${dragIdx === i ? ' dragging' : ''}`}
                    draggable
                    onDragStart={() => setDragIdx(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(i)}
                    onDragEnd={() => setDragIdx(null)}
                  >
                    <span className="drag-handle" aria-hidden="true" title="Drag to reorder (desktop)">⋮⋮</span>
                    <img src={img.dataUrl} alt="" className="image-order-thumb" />
                    <span className="image-order-page-num">#{i + 1}</span>
                    <span className="image-order-name" title={img.name}>{img.name}</span>
                    <div className="order-actions">
                      <button
                        type="button"
                        title="Move Up"
                        disabled={i === 0}
                        onClick={() => moveUp(i)}
                        aria-label={`Move page ${i + 1} up`}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        title="Move Down"
                        disabled={i === images.length - 1}
                        onClick={() => moveDown(i)}
                        aria-label={`Move page ${i + 1} down`}
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        title="Remove page"
                        className="order-remove-btn"
                        onClick={() => removeImage(i)}
                        aria-label={`Remove page ${i + 1}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="action-row compact" style={{ marginTop: '16px' }}>
            <button
              className="primary-button"
              type="button"
              onClick={generatePdf}
              disabled={!images.length}
            >
              Generate PDF ({images.length} {images.length === 1 ? 'Page' : 'Pages'})
            </button>
          </div>

          {status.text && (
            <div className={`result-box ${status.ok ? 'success' : 'error'}`} style={{ marginTop: '12px' }}>
              {status.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
