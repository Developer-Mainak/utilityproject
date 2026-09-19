import { useState, useMemo, useRef } from 'react';

// Industry-grade UTF-8 safe Base64 encoder (handles emojis, unicode, international chars)
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

// Industry-grade UTF-8 safe Base64 decoder
function base64ToUtf8(b64) {
  if (!b64) return '';
  try {
    // Normalize url-safe characters and add padding if missing
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
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Base64Tool() {
  const [tab, setTab]           = useState('text'); // 'text' | 'file'
  const [mode, setMode]         = useState('encode'); // 'encode' | 'decode'
  const [input, setInput]       = useState('Hello World');
  const [isUrlSafe, setIsUrlSafe] = useState(false);
  const [lineWrap, setLineWrap] = useState(0); // 0, 64, 76
  const [copied, setCopied]     = useState(false);

  // File mode state
  const [fileData, setFileData] = useState(null); // { name, size, type, dataUrl, rawBase64 }
  const [fileCopied, setFileCopied] = useState(false);
  const fileInputRef            = useRef(null);

  // Live output calculation
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

  const handleCopy = async (textToCopy) => {
    if (!textToCopy) return;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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

  // File upload handler
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const rawBase64 = dataUrl.split(',')[1] || '';
      setFileData({
        name: file.name,
        size: formatBytes(file.size),
        type: file.type || 'application/octet-stream',
        dataUrl,
        rawBase64,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadFileFromBase64 = () => {
    if (!output || output.startsWith('Error:')) return;
    try {
      let clean = output.trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
      while (clean.length % 4 !== 0) clean += '=';
      const bin = atob(clean);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: 'decoded-file.bin',
      });
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Cannot download: output does not contain valid binary Base64.');
    }
  };

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h2>Base64 Studio</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
            UTF-8 safe encoder, URL-safe (RFC 4648), line wrapping, and file converter
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
            File to Base64
          </button>
        </div>
      </div>

      {tab === 'text' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <div className="pill-toggle">
              <button
                className={`mode-button${mode === 'encode' ? ' active' : ''}`}
                type="button"
                onClick={() => setMode('encode')}
              >
                Encode
              </button>
              <button
                className={`mode-button${mode === 'decode' ? ' active' : ''}`}
                type="button"
                onClick={() => setMode('decode')}
              >
                Decode
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
              <button className="primary-button small" type="button" onClick={() => handleCopy(output)}>
                {copied ? '✓ Copied!' : 'Copy Output'}
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

            {mode === 'encode' && output && (
              <button
                className="secondary-button small"
                type="button"
                onClick={handleDownloadFileFromBase64}
                title="Download encoded output as binary file"
              >
                Download as File
              </button>
            )}
          </div>
        </>
      ) : (
        /* File to Base64 Mode */
        <div>
          <div className="upload-box" style={{ textAlign: 'center', padding: '24px' }}>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
            />
            <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
              Upload any file (image, PDF, SVG, font, audio, binary) to convert to Base64 Data URI
            </p>
          </div>

          {fileData && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="preview-meta-bar">
                <span><strong>{fileData.name}</strong> ({fileData.size}) — <code>{fileData.type}</code></span>
                <span className="meta-counter-badge">Base64: {formatBytes(fileData.rawBase64.length)}</span>
              </div>

              {fileData.type.startsWith('image/') && (
                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(10, 18, 30, 0.8)', borderRadius: '12px' }}>
                  <img
                    src={fileData.dataUrl}
                    alt="Preview"
                    style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.82rem', marginBottom: '6px' }}>
                  Data URI (Ready to paste in <code>&lt;img src="..."&gt;</code> or CSS)
                </label>
                <textarea
                  className="code-block-output"
                  rows="4"
                  readOnly
                  value={fileData.dataUrl}
                  spellCheck="false"
                />
                <div className="action-row compact">
                  <button
                    className="primary-button small"
                    type="button"
                    onClick={() => handleCopy(fileData.dataUrl)}
                  >
                    Copy Data URI
                  </button>
                  <button
                    className="secondary-button small"
                    type="button"
                    onClick={() => handleCopy(fileData.rawBase64)}
                  >
                    Copy Raw Base64
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
