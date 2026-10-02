import { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';

const isImage = (f) => f && (f.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name));
const isPdf = (f) => f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name));

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

// Helper: Extract plain text from .docx XML structure
async function parseDocxText(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(arrayBuffer);

    const matches = text.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
    if (matches && matches.length > 0) {
      const extracted = matches
        .map((m) => m.replace(/<[^>]+>/g, ''))
        .join(' ');
      return extracted
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }

    const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return clean || 'Document text extracted successfully.';
  } catch {
    return 'Could not parse document text.';
  }
}

export default function PdfStudioTool() {
  const [tab, setTab] = useState('image'); // 'image' | 'document' | 'merge'

  // ═══════════════════════════════════════════════
  // 1. IMAGE TO PDF STATE
  // ═══════════════════════════════════════════════
  const [images, setImages]   = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [imgStatus, setImgStatus] = useState({ text: '', ok: true });
  const imgInputRef           = useRef(null);

  // ═══════════════════════════════════════════════
  // 2. DOCUMENT TO PDF STATE
  // ═══════════════════════════════════════════════
  const [docFile, setDocFile]         = useState(null);
  const [docFont, setDocFont]         = useState('helvetica');
  const [docFontSize, setDocFontSize] = useState(11);
  const [docPageSize, setDocPageSize] = useState('a4');
  const [includePageNums, setIncludePageNums] = useState(true);
  const [docHeader, setDocHeader]     = useState(''); // Default empty (no header by default)
  const [docStatus, setDocStatus]     = useState({ text: '', ok: true });
  const [isDocDragging, setIsDocDragging] = useState(false);
  const docInputRef                   = useRef(null);

  // ═══════════════════════════════════════════════
  // 3. MERGE PDFS STATE
  // ═══════════════════════════════════════════════
  const [pdfList, setPdfList]           = useState([]); // [{ id, name, size, pageCount, bytes }]
  const [mergeDragIdx, setMergeDragIdx] = useState(null);
  const [mergeFilename, setMergeFilename] = useState('merged-document');
  const [mergeStatus, setMergeStatus]   = useState({ text: '', ok: true });
  const [isMergeDragging, setIsMergeDragging] = useState(false);
  const mergeInputRef                 = useRef(null);

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
      const reader = new FileReader();
      textContent = await new Promise((res) => {
        reader.onload = () => res(reader.result || '');
        reader.onerror = () => res('');
        reader.readAsText(file);
      });
    }

    setDocFile({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type || extension || 'document',
      extension,
      textContent: textContent.trim(),
    });

    // Leave docHeader empty by default so filename is NOT printed in the header unless user types one
    setDocHeader('');
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

      const margin = 45;
      const maxLineWidth = pageWidth - margin * 2;
      const lineHeight = docFontSize * 1.45;

      doc.setFont(docFont, 'normal');
      doc.setFontSize(docFontSize);

      const paragraphs = docFile.textContent.split('\n');
      let lines = [];
      paragraphs.forEach((p) => {
        if (!p.trim()) {
          lines.push('');
        } else {
          const wrapped = doc.splitTextToSize(p, maxLineWidth);
          lines.push(...wrapped);
        }
      });

      let currentY = margin + 20;

      const renderHeader = () => {
        // ONLY render header if docHeader has actual text entered by the user
        if (docHeader && docHeader.trim()) {
          doc.setFontSize(9);
          doc.setTextColor(140, 150, 165);
          doc.text(docHeader.trim(), margin, margin - 15);
          doc.setDrawColor(210, 220, 230);
          doc.setLineWidth(0.5);
          doc.line(margin, margin - 8, pageWidth - margin, margin - 8);
        }
      };

      const renderFooter = (pageNum, totalPages) => {
        if (includePageNums) {
          doc.setFontSize(8.5);
          doc.setTextColor(140, 150, 165);
          const footerText = `Page ${pageNum} of ${totalPages}`;
          doc.text(footerText, pageWidth - margin - doc.getTextWidth(footerText), pageHeight - 20);
        }
      };

      renderHeader();

      for (let i = 0; i < lines.length; i++) {
        if (currentY + lineHeight > pageHeight - margin - 25) {
          doc.addPage();
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

  // ═══════════════════════════════════════════════
  // 3. MERGE PDFS HANDLERS
  // ═══════════════════════════════════════════════
  const loadPdfsForMerge = async (files) => {
    const valid = Array.from(files).filter(isPdf);
    if (!valid.length) {
      setMergeStatus({ text: 'Please select valid PDF files (.pdf).', ok: false });
      return;
    }

    setMergeStatus({ text: 'Reading PDF files…', ok: true });

    try {
      const loaded = await Promise.all(
        valid.map(async (f) => {
          const bytes = await f.arrayBuffer();
          let pageCount = '?';
          try {
            const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
            pageCount = pdfDoc.getPageCount();
          } catch {
            pageCount = '?';
          }
          return {
            id: Math.random().toString(36).substring(2, 9),
            file: f,
            name: f.name,
            size: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
            pageCount,
            bytes,
          };
        })
      );

      setPdfList((prev) => [...prev, ...loaded]);
      setMergeStatus({
        text: `${loaded.length} PDF file(s) added. Arrange order and click Merge below.`,
        ok: true,
      });
    } catch {
      setMergeStatus({ text: 'Error reading PDF files.', ok: false });
    }
  };

  const handleMergeFileUpload = (e) => {
    loadPdfsForMerge(e.target.files);
  };

  const handleMergeDragOver = (e) => {
    e.preventDefault();
    setIsMergeDragging(true);
  };

  const handleMergeDragLeave = () => {
    setIsMergeDragging(false);
  };

  const handleMergeDrop = (e) => {
    e.preventDefault();
    setIsMergeDragging(false);
    loadPdfsForMerge(e.dataTransfer.files);
  };

  const moveMergePdfUp = (index) => {
    if (index <= 0) return;
    setPdfList((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const moveMergePdfDown = (index) => {
    if (index >= pdfList.length - 1) return;
    setPdfList((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMergePdfDropReorder = (toIdx) => {
    if (mergeDragIdx === null || mergeDragIdx === toIdx) return;
    setPdfList((prev) => {
      const next = [...prev];
      const [moved] = next.splice(mergeDragIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setMergeDragIdx(null);
  };

  const removeMergePdf = (index) => {
    setPdfList((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllMergePdfs = () => {
    setPdfList([]);
    if (mergeInputRef.current) mergeInputRef.current.value = '';
    setMergeStatus({ text: 'All PDF files cleared.', ok: true });
  };

  const mergePdfs = async () => {
    if (pdfList.length < 2) {
      setMergeStatus({ text: 'Please add at least 2 PDF files to merge.', ok: false });
      return;
    }

    setMergeStatus({ text: 'Merging PDF files into single document…', ok: true });

    try {
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < pdfList.length; i++) {
        const item = pdfList[i];
        const srcDoc = await PDFDocument.load(item.bytes, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const filename = mergeFilename.trim().endsWith('.pdf')
        ? mergeFilename.trim()
        : `${mergeFilename.trim()}.pdf`;

      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: filename,
      });
      a.click();
      URL.revokeObjectURL(url);

      const totalPagesMerged = mergedPdf.getPageCount();
      setMergeStatus({
        text: `✓ Merged ${pdfList.length} PDFs (${totalPagesMerged} total pages) successfully!`,
        ok: true,
      });
    } catch (err) {
      console.error(err);
      setMergeStatus({ text: 'Failed to merge PDFs. Ensure files are not password-protected.', ok: false });
    }
  };

  return (
    <div className="card">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>PDF Studio</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
            Convert images, Word docs, spreadsheets to PDF &amp; merge multiple PDFs — 100% in your browser
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
          <button
            className={`mode-button${tab === 'merge' ? ' active' : ''}`}
            type="button"
            onClick={() => setTab('merge')}
          >
            📑 Merge PDFs
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
      ) : tab === 'document' ? (
        /* ═══════════════════════════════════════════════
           DOCUMENT TO PDF SECTION
        ════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                      Header Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={docHeader}
                      onChange={(e) => setDocHeader(e.target.value)}
                      placeholder="Leave blank for no header"
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
      ) : (
        /* ═══════════════════════════════════════════════
           MERGE PDFS SECTION
        ════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="upload-box"
            style={{
              textAlign: 'center',
              padding: '28px 20px',
              border: isMergeDragging ? '2px dashed var(--secondary)' : '2px dashed var(--line)',
              background: isMergeDragging ? 'rgba(34, 211, 238, 0.05)' : undefined,
              borderRadius: '12px',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onDragOver={handleMergeDragOver}
            onDragLeave={handleMergeDragLeave}
            onDrop={handleMergeDrop}
            onClick={() => mergeInputRef.current?.click()}
          >
            <input
              ref={mergeInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={handleMergeFileUpload}
            />
            <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>📑</div>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text)' }}>
              Drag &amp; drop multiple PDF files here, or click to browse
            </strong>
            <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
              Select 2 or more PDF files to merge into a single, unified PDF document
            </p>
          </div>

          {pdfList.length > 0 && (
            <div className="order-controls">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ margin: 0 }}>
                  PDF Merge Sequence ({pdfList.length} file{pdfList.length === 1 ? '' : 's'})
                </label>
                <button
                  className="secondary-button small"
                  type="button"
                  onClick={clearAllMergePdfs}
                  style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                >
                  Clear all
                </button>
              </div>

              <div className="order-list">
                {pdfList.map((item, i) => (
                  <div
                    key={item.id}
                    className={`image-order-item${mergeDragIdx === i ? ' dragging' : ''}`}
                    draggable
                    onDragStart={() => setMergeDragIdx(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleMergePdfDropReorder(i)}
                    onDragEnd={() => setMergeDragIdx(null)}
                  >
                    <span className="drag-handle" aria-hidden="true" title="Drag to reorder">⋮⋮</span>
                    <span style={{ fontSize: '1.2rem', marginRight: '6px' }}>📄</span>
                    <span className="image-order-page-num">#{i + 1}</span>
                    <span className="image-order-name" title={item.name}>
                      <strong>{item.name}</strong> ({item.size}) — {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                    </span>

                    <div className="order-actions">
                      <button
                        type="button"
                        title="Move Up"
                        disabled={i === 0}
                        onClick={() => moveMergePdfUp(i)}
                        aria-label={`Move PDF ${i + 1} up`}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        title="Move Down"
                        disabled={i === pdfList.length - 1}
                        onClick={() => moveMergePdfDown(i)}
                        aria-label={`Move PDF ${i + 1} down`}
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        title="Remove file"
                        className="order-remove-btn"
                        onClick={() => removeMergePdf(i)}
                        aria-label={`Remove PDF ${i + 1}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Output Filename:</label>
                  <input
                    type="text"
                    value={mergeFilename}
                    onChange={(e) => setMergeFilename(e.target.value)}
                    placeholder="merged-document"
                    style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.82rem' }}
                  />
                </div>

                <button
                  className="primary-button"
                  type="button"
                  style={{ alignSelf: 'flex-end', minHeight: '34px' }}
                  onClick={mergePdfs}
                  disabled={pdfList.length < 2}
                >
                  🔗 Merge {pdfList.length} PDFs
                </button>
              </div>
            </div>
          )}

          {mergeStatus.text && (
            <div className={`result-box ${mergeStatus.ok ? 'success' : 'error'}`}>
              {mergeStatus.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
