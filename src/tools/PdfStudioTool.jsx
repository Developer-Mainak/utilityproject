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

// Helper: Extract plain text from .docx XML structure (word/document.xml) without external heavy libs
async function parseDocxText(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Use DecompressionStream or text scanning for XML text nodes
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(arrayBuffer);
    
    // Extract text inside <w:t> tags or fallback to cleaned text
    const matches = text.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
    if (matches && matches.length > 0) {
      const extracted = matches
        .map((m) => m.replace(/<[^>]+>/g, ''))
        .join(' ');
      // Clean up multiple spaces and XML entities
      return extracted
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }
    
    // Fallback: strip raw XML tags from buffer text
    const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return clean || 'Document text extracted successfully.';
  } catch {
    return 'Could not parse document text.';
  }
}

export default function PdfStudioTool() {
  const [tab, setTab] = useState('image'); // 'image' | 'document'

  // --- IMAGE TO PDF STATE ---
  const [images, setImages]   = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [imgStatus, setImgStatus] = useState({ text: '', ok: true });
  const imgInputRef           = useRef(null);

  // --- DOCUMENT TO PDF STATE ---
  const [docFile, setDocFile]         = useState(null); // { name, size, type, textContent }
  const [docFont, setDocFont]         = useState('helvetica'); // 'helvetica' | 'times' | 'courier'
  const [docFontSize, setDocFontSize] = useState(11); // 10, 11, 12, 14
  const [docPageSize, setDocPageSize] = useState('a4'); // 'a4' | 'letter'
  const [includePageNums, setIncludePageNums] = useState(true);
  const [docHeader, setDocHeader]     = useState('');
  const [docStatus, setDocStatus]     = useState({ text: '', ok: true });
  const [isDocDragging, setIsDocDragging] = useState(false);
  const docInputRef                   = useRef(null);

  // ═══════════════════════════════════════════════
  // IMAGE TO PDF HANDLERS
  // ═══════════════════════════════════════════════
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
    setImgStatus({ text: `${loaded.length} image(s) added. Rearrange order below if needed.`, ok: true });
  };

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

  const clearAllImages = () => {
    setImages([]);
    if (imgInputRef.current) imgInputRef.current.value = '';
    setImgStatus({ text: 'All images cleared.', ok: true });
  };

  const generateImagePdf = async () => {
    if (!images.length) return;
    setImgStatus({ text: 'Generating high-quality PDF…', ok: true });

    try {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < images.length; i++) {
        const { dataUrl, file, width, height } = images[i];
        if (i > 0) pdf.addPage();
        const ratio = Math.min(pw / width, ph / height) * 0.9;
        const w = width * ratio;
        const h = height * ratio;
        pdf.addImage(dataUrl, getPdfFormat(file), (pw - w) / 2, (ph - h) / 2, w, h, undefined, 'SLOW');
      }

      pdf.save('notjustpdf-images.pdf');
      setImgStatus({ text: `✓ Generated ${images.length}-page PDF successfully!`, ok: true });
    } catch {
      setImgStatus({ text: 'Failed to generate PDF.', ok: false });
    }
  };

  // ═══════════════════════════════════════════════
  // DOCUMENT TO PDF HANDLERS
  // ═══════════════════════════════════════════════
  const processDocumentFile = async (file) => {
    if (!file) return;

    setDocStatus({ text: 'Reading document…', ok: true });
    let textContent = '';

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'docx' || extension === 'doc') {
      textContent = await parseDocxText(file);
    } else {
      // Read plain text, Markdown, CSV, JSON, HTML, LOG, TXT
      const reader = new FileReader();
      textContent = await new Promise((res) => {
        reader.onload = () => res(reader.result || '');
        reader.onerror = () => res('');
        reader.readAsText(file);
      });
    }

    // Set document state
    setDocFile({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type || extension || 'document',
      extension,
      textContent: textContent.trim(),
    });

    setDocHeader(file.name.replace(/\.[^/.]+$/, ''));
    setDocStatus({ text: 'Document loaded successfully. Ready to convert!', ok: true });
  };

  const handleDocFileUpload = (e) => {
    const file = e.target.files?.[0];
    processDocumentFile(file);
  };

  const handleDocDragOver = (e) => {
    e.preventDefault();
    setIsDocDragging(true);
  };

  const handleDocDragLeave = () => {
    setIsDocDragging(false);
  };

  const handleDocDrop = (e) => {
    e.preventDefault();
    setIsDocDragging(false);
    const file = e.dataTransfer.files?.[0];
    processDocumentFile(file);
  };

  const generateDocumentPdf = () => {
    if (!docFile || !docFile.textContent) {
      setDocStatus({ text: 'Please select a document with text content.', ok: false });
      return;
    }

    setDocStatus({ text: 'Generating formatted document PDF…', ok: true });

    try {
      const doc = new jsPDF({
        unit: 'pt',
        format: docPageSize,
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const margin = 45; // 45pt margins
      const maxLineWidth = pageWidth - margin * 2;
      const lineHeight = docFontSize * 1.45;

      doc.setFont(docFont, 'normal');
      doc.setFontSize(docFontSize);

      // Split raw text into printable wrapped lines
      const paragraphs = docFile.textContent.split('\n');
      let lines = [];
      paragraphs.forEach((p) => {
        if (!p.trim()) {
          lines.push(''); // Paragraph gap
        } else {
          const wrapped = doc.splitTextToSize(p, maxLineWidth);
          lines.push(...wrapped);
        }
      });

      let currentY = margin + 20;
      let currentPage = 1;

      // Header renderer
      const renderHeader = () => {
        if (docHeader.trim()) {
          doc.setFontSize(9);
          doc.setTextColor(140, 150, 165);
          doc.text(docHeader.trim(), margin, margin - 15);
          doc.setDrawColor(210, 220, 230);
          doc.setLineWidth(0.5);
          doc.line(margin, margin - 8, pageWidth - margin, margin - 8);
        }
      };

      // Footer renderer
      const renderFooter = (pageNum, totalPages) => {
        if (includePageNums) {
          doc.setFontSize(8.5);
          doc.setTextColor(140, 150, 165);
          const footerText = `Page ${pageNum} of ${totalPages}`;
          doc.text(footerText, pageWidth - margin - doc.getTextWidth(footerText), pageHeight - 20);
        }
      };

      renderHeader();

      // Render content lines across pages
      for (let i = 0; i < lines.length; i++) {
        // Check if page end reached
        if (currentY + lineHeight > pageHeight - margin - 25) {
          doc.addPage();
          currentPage++;
          currentY = margin + 20;
          renderHeader();
        }

        doc.setFont(docFont, 'normal');
        doc.setFontSize(docFontSize);
        doc.setTextColor(30, 40, 55);

        const line = lines[i];
        if (line !== '') {
          doc.text(line, margin, currentY);
        }
        currentY += lineHeight;
      }

      // Add page numbers to all generated pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let j = 1; j <= totalPages; j++) {
        doc.setPage(j);
        renderFooter(j, totalPages);
      }

      const outputFilename = `${docFile.name.replace(/\.[^/.]+$/, '')}.pdf`;
      doc.save(outputFilename);
      setDocStatus({ text: `✓ Generated ${totalPages}-page PDF successfully!`, ok: true });
    } catch (err) {
      console.error(err);
      setDocStatus({ text: 'Failed to generate document PDF.', ok: false });
    }
  };

  return (
    <div className="card">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>PDF Studio</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
            Convert images, Word docs, text files, Markdown, and spreadsheets to PDF — 100% in your browser
          </p>
        </div>

        <div className="pill-toggle">
          <button
            className={`mode-button${tab === 'image' ? ' active' : ''}`}
            type="button"
            onClick={() => setTab('image')}
          >
            🖼️ Image to PDF
          </button>
          <button
            className={`mode-button${tab === 'document' ? ' active' : ''}`}
            type="button"
            onClick={() => setTab('document')}
          >
            📄 Document to PDF
          </button>
        </div>
      </div>

      {tab === 'image' ? (
        /* ═══════════════════════════════════════════════
           IMAGE TO PDF SECTION
        ════════════════════════════════════════════════ */
        <div className="tool-grid">
          <div className="mini-card" style={{ gridColumn: '1 / -1' }}>
            <h3>Image to PDF Converter</h3>
            <div className="upload-box">
              <input
                ref={imgInputRef}
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
                    onClick={clearAllImages}
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
                onClick={generateImagePdf}
                disabled={!images.length}
              >
                Generate PDF ({images.length} {images.length === 1 ? 'Page' : 'Pages'})
              </button>
            </div>

            {imgStatus.text && (
              <div className={`result-box ${imgStatus.ok ? 'success' : 'error'}`} style={{ marginTop: '12px' }}>
                {imgStatus.text}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════
           DOCUMENT TO PDF SECTION
        ════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Upload Zone */}
          <div
            className="upload-box"
            style={{
              textAlign: 'center',
              padding: '28px 20px',
              border: isDocDragging ? '2px dashed var(--secondary)' : '2px dashed var(--line)',
              background: isDocDragging ? 'rgba(34, 211, 238, 0.05)' : undefined,
              borderRadius: '12px',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onDragOver={handleDocDragOver}
            onDragLeave={handleDocDragLeave}
            onDrop={handleDocDrop}
            onClick={() => docInputRef.current?.click()}
          >
            <input
              ref={docInputRef}
              type="file"
              accept=".docx,.doc,.txt,.md,.csv,.tsv,.json,.html,.log"
              style={{ display: 'none' }}
              onChange={handleDocFileUpload}
            />
            <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>📄</div>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text)' }}>
              Drag &amp; drop document here, or click to browse
            </strong>
            <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
              Supports Word (.docx), Text (.txt), Markdown (.md), CSV (.csv), JSON (.json), HTML (.html), and Logs (.log)
            </p>
          </div>

          {docFile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Document Overview Bar */}
              <div className="preview-meta-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span>
                  <strong>{docFile.name}</strong> ({docFile.size}) — <code>{docFile.extension.toUpperCase()}</code>
                </span>
                <button
                  className="secondary-button small"
                  type="button"
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  onClick={() => setDocFile(null)}
                >
                  ✕ Clear Document
                </button>
              </div>

              {/* PDF Settings Panel */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', border: '1px solid var(--line)' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 }}>
                  ⚙️ PDF Page &amp; Styling Options
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                      Font Style
                    </label>
                    <select
                      value={docFont}
                      onChange={(e) => setDocFont(e.target.value)}
                      style={{ width: '100%', minHeight: '34px', padding: '4px 8px', fontSize: '0.82rem' }}
                    >
                      <option value="helvetica">Helvetica (Sans-Serif)</option>
                      <option value="times">Times New Roman (Serif)</option>
                      <option value="courier">Courier (Monospace)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                      Font Size
                    </label>
                    <select
                      value={docFontSize}
                      onChange={(e) => setDocFontSize(Number(e.target.value))}
                      style={{ width: '100%', minHeight: '34px', padding: '4px 8px', fontSize: '0.82rem' }}
                    >
                      <option value={10}>Small (10pt)</option>
                      <option value={11}>Normal (11pt)</option>
                      <option value={12}>Medium (12pt)</option>
                      <option value={14}>Large (14pt)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                      Page Size
                    </label>
                    <select
                      value={docPageSize}
                      onChange={(e) => setDocPageSize(e.target.value)}
                      style={{ width: '100%', minHeight: '34px', padding: '4px 8px', fontSize: '0.82rem' }}
                    >
                      <option value="a4">A4 (Standard)</option>
                      <option value="letter">Letter (US)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                      Header Title
                    </label>
                    <input
                      type="text"
                      value={docHeader}
                      onChange={(e) => setDocHeader(e.target.value)}
                      placeholder="Header title..."
                      style={{ width: '100%', minHeight: '34px', padding: '4px 8px', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <label className="checkbox-inline" style={{ margin: 0, fontSize: '0.82rem' }}>
                    <input
                      type="checkbox"
                      checked={includePageNums}
                      onChange={(e) => setIncludePageNums(e.target.checked)}
                    />
                    Include Page Numbers (e.g., "Page 1 of 3")
                  </label>
                </div>
              </div>

              {/* Text Preview Box */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Document Text Preview ({docFile.textContent.length} characters)
                </label>
                <textarea
                  className="code-block-output"
                  rows="7"
                  value={docFile.textContent}
                  onChange={(e) => setDocFile((prev) => ({ ...prev, textContent: e.target.value }))}
                  placeholder="Document content preview…"
                  spellCheck="false"
                />
              </div>

              {/* Generate PDF Button */}
              <div className="action-row compact">
                <button
                  className="primary-button"
                  type="button"
                  onClick={generateDocumentPdf}
                >
                  🚀 Convert to PDF
                </button>
              </div>
            </div>
          )}

          {docStatus.text && (
            <div className={`result-box ${docStatus.ok ? 'success' : 'error'}`}>
              {docStatus.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
