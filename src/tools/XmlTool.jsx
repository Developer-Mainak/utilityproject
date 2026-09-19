import { useState } from 'react';

/* ── Syntax highlight ─────────────────────────────────────────────────────── */
function highlightXml(raw) {
  if (!raw) return '';
  return raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // tags
    .replace(/&lt;(\/?[a-zA-Z][a-zA-Z0-9._:-]*)/g, '&lt;<span class="token-tag">$1</span>')
    // attributes
    .replace(/\b([a-zA-Z][a-zA-Z0-9._:-]*)=/g, '<span class="token-attr">$1</span>=')
    // attribute values
    .replace(/="([^"]*)"/g, '="<span class="token-value">$1</span>"')
    // close bracket
    .replace(/&gt;/g, '<span class="token-punctuation">&gt;</span>');
}

function lineNumbers(text) {
  const n = text ? text.split('\n').length : 1;
  return Array.from({ length: n }, (_, i) => `<span>${i + 1}</span>`).join('');
}

/* ── XML pretty-printer ───────────────────────────────────────────────────── */
function formatXml(src) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(src.trim(), 'application/xml');
  const err    = doc.querySelector('parsererror');
  if (err) throw new Error(err.textContent.split('\n')[0].trim());

  const raw = new XMLSerializer().serializeToString(doc);

  let indent = 0;
  const lines = raw
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map((line) => {
      line = line.trim();
      if (!line) return '';
      if (line.startsWith('</')) {
        indent = Math.max(0, indent - 1);
        return '  '.repeat(indent) + line;
      }
      const out = '  '.repeat(indent) + line;
      if (line.startsWith('<') && !line.startsWith('<?') && !line.startsWith('<!') && !line.endsWith('/>') && !line.includes('</')) {
        indent += 1;
      }
      return out;
    })
    .filter(Boolean);

  return lines.join('\n');
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function XmlTool() {
  const [input, setInput]   = useState('');
  const [badge, setBadge]   = useState({ text: 'Valid', ok: true });
  const [status, setStatus] = useState({ text: 'Ready to validate.', ok: true });

  const validate = (src) => {
    if (!src.trim()) { setBadge({ text: 'Valid', ok: true }); setStatus({ text: 'Ready to validate.', ok: true }); return true; }
    const doc = new DOMParser().parseFromString(src, 'application/xml');
    const err = doc.querySelector('parsererror');
    if (err) {
      const msg = err.textContent.split('\n')[0].trim();
      setBadge({ text: 'Invalid', ok: false }); setStatus({ text: msg, ok: false });
      return false;
    }
    setBadge({ text: 'Valid', ok: true }); setStatus({ text: '✓ Valid XML.', ok: true });
    return true;
  };

  const handleFormat = () => {
    try {
      setInput(formatXml(input));
      setBadge({ text: 'Valid', ok: true }); setStatus({ text: '✓ Formatted successfully.', ok: true });
    } catch (e) {
      setBadge({ text: 'Invalid', ok: false }); setStatus({ text: e.message, ok: false });
    }
  };

  return (
    <div className="card">
      <div className="section-header">
        <h2>XML validator &amp; formatter</h2>
        <div className={`status-badge ${badge.ok ? 'success' : 'error'}`}>{badge.text}</div>
      </div>

      <label>XML input
        <div className="code-editor-shell">
          <div
            className="code-editor-gutter"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: lineNumbers(input) }}
          />
          <pre
            className="code-editor-highlight"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightXml(input) }}
          />
          <textarea
            className="code-editor-input"
            rows="12"
            spellCheck="false"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
      </label>

      <div className="action-row">
        <button className="primary-button"   type="button" onClick={handleFormat}>Format</button>
        <button className="secondary-button" type="button" onClick={() => validate(input)}>Validate</button>
      </div>

      <div className={`result-box ${status.ok ? 'success' : 'error'}`}>{status.text}</div>
    </div>
  );
}
