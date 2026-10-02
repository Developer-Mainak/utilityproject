import { useState, useMemo, useRef } from 'react';

// UTF-8 safe Base64 encoder
function utf8ToBase64(str, isUrlSafe = false, lineWrap = 0) {
  if (!str) return '';
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  let b64 = btoa(bin);

  if (isUrlSafe) {
    b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  if (lineWrap > 0) {
    const regex = new RegExp(`(.{${lineWrap}})`, 'g');
    b64 = b64.replace(regex, '$1\n').trim();
  }

  return b64;
}

// UTF-8 safe Base64 decoder
function base64ToUtf8(b64) {
  if (!b64) return '';
  try {
    let clean = b64.trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
    while (clean.length % 4 !== 0) {
      clean += '=';
    }
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return 'Error: Invalid Base64 string';
  }
}

function getByteLength(str) {
  return new TextEncoder().encode(str).length;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Extract MIME type from Data URI or infer from Base64 header
function detectMimeType(str) {
  if (!str) return 'application/octet-stream';
  const match = str.trim().match(/^data:([^;]+);base64,/i);
  if (match) return match[1];

  const clean = str.trim().replace(/\s+/g, '');
  if (clean.startsWith('JVBERi0')) return 'application/pdf';
  if (clean.startsWith('iVBORw0KGgo')) return 'image/png';
  if (clean.startsWith('/9j/')) return 'image/jpeg';
  if (clean.startsWith('R0lGOD')) return 'image/gif';
  if (clean.startsWith('UklGR')) return 'image/webp';
  if (clean.startsWith('UEsDB')) return 'application/zip';

  return 'application/octet-stream';
}

export default function Base64Tool() {
  const [tab, setTab]           = useState('text'); // 'text' | 'file'
  const [mode, setMode]         = useState('encode'); // 'encode' | 'decode'
  const [input, setInput]       = useState('Hello World');
  const [isUrlSafe, setIsUrlSafe] = useState(false);
  const [lineWrap, setLineWrap] = useState(0);
  const [copiedText, setCopiedText] = useState('');

  // File to Base64 state
  const [fileMode, setFileMode] = useState('file-to-b64'); // 'file-to-b64' | 'b64-to-file'
  const [fileData, setFileData] = useState(null); // { name, size, type, dataUrl, rawBase64 }
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef            = useRef(null);

  // Base64 to File state
  const [b64FileInput, setB64FileInput] = useState('');
  const [downloadFilename, setDownloadFilename] = useState('decoded-file');

  // Live text mode calculation
  const output = useMemo(() => {
    if (!input) return '';
    if (mode === 'encode') {
      return utf8ToBase64(input, isUrlSafe, lineWrap);
    } else {
      return base64ToUtf8(input);
    }
  }, [input, mode, isUrlSafe, lineWrap]);

  const stats = useMemo(() => {
    const inBytes = getByteLength(input);
    const outBytes = getByteLength(output);
    const ratio = inBytes > 0 ? ((outBytes / inBytes) * 100).toFixed(0) : 0;
    return {
      inChars: input.length,
      inBytes: formatBytes(inBytes),
      outChars: output.length,
      outBytes: formatBytes(outBytes),
      ratio: `${ratio}%`,
    };
  }, [input, output]);

  const copyToClipboard = async (text, label) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 1800);
  };

  const handleSwap = () => {
    if (!output || output.startsWith('Error:')) return;
    setInput(output);
    setMode(mode === 'encode' ? 'decode' : 'encode');
  };

  const handleLoadSample = () => {
    if (mode === 'encode') {
      setInput('Authorization: Bearer secret-token-key-123\nName: Alex Dev 🚀\nLocale: en-US');
    } else {
      setInput('SGVsbG8sIFdvcmxkISDwn5qAIFByaXZldCwg0JzQuNGAIQ==');
    }
  };

  // Process selected file
  const processFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const rawBase64 = dataUrl.split(',')[1] || '';
      setFileData({
        name: file.name,
        size: formatBytes(file.size),
        rawSizeBytes: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl,
        rawBase64,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  // Download raw Base64 string as .txt file
  const handleDownloadBase64Txt = () => {
    if (!fileData?.rawBase64) return;
    const blob = new Blob([fileData.rawBase64], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${fileData.name}.base64.txt`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Base64 string back to binary file (PDF, Image, etc.)
  const handleDownloadFileFromB64Input = () => {
    if (!b64FileInput.trim()) return;
    try {
      let raw = b64FileInput.trim();
      if (raw.includes(',')) {
        raw = raw.split(',')[1] || '';
      }
      let clean = raw.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
      while (clean.length % 4 !== 0) clean += '=';

      const bin = atob(clean);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }

      const mime = detectMimeType(b64FileInput);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);

      let ext = '.bin';
      if (mime === 'application/pdf') ext = '.pdf';
      else if (mime === 'image/png') ext = '.png';
      else if (mime === 'image/jpeg') ext = '.jpg';
      else if (mime === 'image/gif') ext = '.gif';
      else if (mime === 'image/webp') ext = '.webp';
      else if (mime === 'application/zip') ext = '.zip';

      const filename = downloadFilename.trim().endsWith(ext)
        ? downloadFilename.trim()
        : `${downloadFilename.trim()}${ext}`;

      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: filename,
      });
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to decode: Invalid Base64 data string.');
    }
  };

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h2>Base64 Studio</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
            UTF-8 safe text encoder/decoder &amp; complete file-to-Base64 converter (PDF, images, audio, docs)
          </p>
        </div>

        <div className="pill-toggle">
          <button
            className={`mode-button${tab === 'text' ? ' active' : ''}`}
            type="button"
            onClick={() => setTab('text')}
          >
            Text Mode
          </button>
          <button
            className={`mode-button${tab === 'file' ? ' active' : ''}`}
            type="button"
            onClick={() => setTab('file')}
          >
            File Mode
          </button>
        </div>
      </div>

      {tab === 'text' ? (
        /* TEXT MODE */
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <div className="pill-toggle">
              <button
                className={`mode-button${mode === 'encode' ? ' active' : ''}`}
                type="button"
                onClick={() => setMode('encode')}
              >
                Encode Text
              </button>
              <button
                className={`mode-button${mode === 'decode' ? ' active' : ''}`}
                type="button"
                onClick={() => setMode('decode')}
              >
                Decode Base64
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <label className="checkbox-inline" style={{ margin: 0, fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={isUrlSafe}
                  onChange={(e) => setIsUrlSafe(e.target.checked)}
                />
                URL-Safe (RFC 4648)
              </label>

              {mode === 'encode' && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                  <span>Wrap:</span>
                  <select
                    value={lineWrap}
                    onChange={(e) => setLineWrap(Number(e.target.value))}
                    style={{ minHeight: '32px', width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                  >
                    <option value={0}>None</option>
                    <option value={64}>64 chars (MIME)</option>
                    <option value={76}>76 chars (PEM)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="stacked-fields">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)' }}>
                  Input {mode === 'encode' ? '(Plaintext)' : '(Base64)'}
                </span>
                <span className="meta-counter-badge">
                  {stats.inChars} chars | {stats.inBytes}
                </span>
              </div>
              <textarea
                className="code-block-input"
                rows="9"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'encode' ? 'Enter text to encode…' : 'Enter Base64 string to decode…'}
                spellCheck="false"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)' }}>
                  Output {mode === 'encode' ? '(Base64)' : '(Decoded Text)'}
                </span>
                <span className="meta-counter-badge">
                  {stats.outChars} chars | {stats.outBytes}
                </span>
              </div>
              <textarea
                className="code-block-output"
                rows="9"
                readOnly
                value={output}
                placeholder="Result will appear here…"
                spellCheck="false"
              />
            </div>
          </div>

          <div className="action-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="primary-button small" type="button" onClick={() => copyToClipboard(output, 'output')}>
                {copiedText === 'output' ? '✓ Copied!' : 'Copy Output'}
              </button>
              <button className="secondary-button small" type="button" onClick={handleSwap} title="Swap output into input">
                ⇄ Swap
              </button>
              <button className="secondary-button small" type="button" onClick={handleLoadSample}>
                Sample
              </button>
              <button className="secondary-button small" type="button" onClick={() => setInput('')}>
                Clear
              </button>
            </div>
          </div>
        </>
      ) : (
        /* FILE MODE */
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <div className="pill-toggle">
              <button
                className={`mode-button${fileMode === 'file-to-b64' ? ' active' : ''}`}
                type="button"
                onClick={() => setFileMode('file-to-b64')}
              >
                Encode File ➔ Base64
              </button>
              <button
                className={`mode-button${fileMode === 'b64-to-file' ? ' active' : ''}`}
                type="button"
                onClick={() => setFileMode('b64-to-file')}
              >
                Decode Base64 ➔ File
              </button>
            </div>
          </div>

          {fileMode === 'file-to-b64' ? (
            /* File to Base64 Encoder */
            <div>
              <div
                className="upload-box"
                style={{
                  textAlign: 'center',
                  padding: '28px 20px',
                  border: isDragging ? '2px dashed var(--secondary)' : '2px dashed var(--line)',
                  background: isDragging ? 'rgba(34, 211, 238, 0.05)' : undefined,
                  borderRadius: '12px',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>📁</div>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text)' }}>
                  Drag &amp; drop any file here, or click to browse
                </strong>
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Supports PDF, Images (PNG, JPG, WEBP, SVG), Audio, Fonts, ZIP, and all binary files
                </p>
              </div>

              {fileData && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="preview-meta-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span>
                      <strong>{fileData.name}</strong> ({fileData.size}) — <code>{fileData.type}</code>
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="meta-counter-badge">
                        Base64 Size: {formatBytes(fileData.rawBase64.length)}
                      </span>
                      <button
                        className="secondary-button small"
                        type="button"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        onClick={() => setFileData(null)}
                      >
                        ✕ Clear
                      </button>
                    </div>
                  </div>

                  {/* Media Preview (Image, PDF indicator, Audio) */}
                  {fileData.type.startsWith('image/') && (
                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(10, 18, 30, 0.8)', borderRadius: '10px' }}>
                      <img
                        src={fileData.dataUrl}
                        alt="File Preview"
                        style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }}
                      />
                    </div>
                  )}

                  {fileData.type === 'application/pdf' && (
                    <div style={{ padding: '14px', background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.25)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '2rem' }}>📄</span>
                      <div>
                        <strong style={{ color: '#a78bfa', fontSize: '0.9rem' }}>PDF File Encoded Successfully</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                          Ready to embed in HTML, JSON APIs, or send via Webhook as Base64 Data URI.
                        </p>
                      </div>
                    </div>
                  )}

                  {fileData.type.startsWith('audio/') && (
                    <div style={{ padding: '10px', background: 'rgba(10, 18, 30, 0.8)', borderRadius: '10px', textAlign: 'center' }}>
                      <audio controls src={fileData.dataUrl} style={{ width: '100%', maxHeight: '40px' }} />
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        Data URI (Ready to embed in <code>&lt;img&gt;</code>, <code>&lt;embed&gt;</code>, or CSS)
                      </label>
                      <button
                        className="primary-button small"
                        type="button"
                        onClick={() => copyToClipboard(fileData.dataUrl, 'dataUri')}
                      >
                        {copiedText === 'dataUri' ? '✓ Copied!' : 'Copy Data URI'}
                      </button>
                    </div>
                    <textarea
                      className="code-block-output"
                      rows="4"
                      readOnly
                      value={fileData.dataUrl}
                      spellCheck="false"
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        Raw Base64 String (Without Data URI prefix)
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="secondary-button small"
                          type="button"
                          onClick={() => copyToClipboard(fileData.rawBase64, 'rawB64')}
                        >
                          {copiedText === 'rawB64' ? '✓ Copied!' : 'Copy Raw Base64'}
                        </button>
                        <button
                          className="secondary-button small"
                          type="button"
                          onClick={handleDownloadBase64Txt}
                        >
                          Save as .txt
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="code-block-output"
                      rows="4"
                      readOnly
                      value={fileData.rawBase64}
                      spellCheck="false"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Base64 to File Decoder */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Paste Base64 String or Data URI (PDF, PNG, JPG, ZIP, etc.)
                </label>
                <textarea
                  className="code-block-input"
                  rows="8"
                  value={b64FileInput}
                  onChange={(e) => setB64FileInput(e.target.value)}
                  placeholder="Paste base64 string (e.g. JVBERi0xLj... or data:application/pdf;base64,...)"
                  spellCheck="false"
                />
              </div>

              {b64FileInput.trim() && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Detected Format:</span>
                    <code style={{ fontSize: '0.82rem', color: 'var(--secondary)' }}>
                      {detectMimeType(b64FileInput)}
                    </code>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '180px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Output Filename:</span>
                    <input
                      type="text"
                      value={downloadFilename}
                      onChange={(e) => setDownloadFilename(e.target.value)}
                      placeholder="e.g. document"
                      style={{ padding: '4px 10px', fontSize: '0.82rem', minHeight: '34px' }}
                    />
                  </div>

                  <button
                    className="primary-button small"
                    type="button"
                    style={{ alignSelf: 'flex-end', minHeight: '34px' }}
                    onClick={handleDownloadFileFromB64Input}
                  >
                    ⬇ Download Original File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
