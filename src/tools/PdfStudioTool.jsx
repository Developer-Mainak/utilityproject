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
  const inputRef              = useRef(null);

  const loadFiles = async (files) => {
    const valid = Array.from(files).filter(isImage);
    const loaded = await Promise.all(
      valid.map(async (f) => {
        const dataUrl = await toDataUrl(f);
        const img = await loadImg(dataUrl);
        return { file: f, name: f.name, dataUrl, width: img.width, height: img.height };
      })
    );
    setImages(loaded);
  };

  const handleDrop = (toIdx) => {
    if (dragIdx === null || dragIdx === toIdx) return;
    const next = [...images];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(toIdx, 0, moved);
    setImages(next);
    setDragIdx(null);
  };

  const generatePdf = async () => {
    if (!images.length) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    for (let i = 0; i < images.length; i++) {
      const { dataUrl, file, width, height } = images[i];
      if (i > 0) doc.addPage();
      const ratio = Math.min(pw / width, ph / height) * 0.9;
      const w = width * ratio;
      const h = height * ratio;
      doc.addImage(dataUrl, getPdfFormat(file), (pw - w) / 2, (ph - h) / 2, w, h, undefined, 'FAST');
    }

    doc.save('notjustpdf-images.pdf');
  };

  return (
    <div className="card">
      <div className="section-header">
        <h2>PDF Studio</h2>
        <div className="status-badge success">Browser-first</div>
      </div>

      <div className="tool-grid">
        <div className="mini-card">
          <h3>Image to PDF</h3>
          <div className="upload-box">
            <input ref={inputRef} type="file" accept="image/*" multiple onChange={(e) => loadFiles(e.target.files)} />
          </div>

          {images.length > 0 && (
            <div className="image-gallery">
              {images.map((img, i) => (
                <div key={img.name + i} className="image-item">
                  <img src={img.dataUrl} alt={img.name} />
                  <span>{img.name}</span>
                </div>
              ))}
            </div>
          )}

          {images.length > 0 && (
            <div className="order-controls">
              <label>Page order</label>
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
                    <span className="drag-handle" aria-hidden="true">⋮⋮</span>
                    <span>#{i + 1}</span>
                    <span>{img.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="action-row compact">
            <button className="primary-button small" type="button" onClick={generatePdf}>Generate PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}
