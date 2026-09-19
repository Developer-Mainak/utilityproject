import { useState } from 'react';

/* ── Syntax highlight ─────────────────────────────────────────────────────── */
function highlightJson(raw) {
  if (!raw) return '';
  return raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // keys
    .replace(/"([^"\\]*(\\.[^"\\]*)*)"(\s*:)/g, '<span class="token-key">"$1"</span>$3')
    // string values
    .replace(/:\s*"([^"\\]*(\\.[^"\\]*)*)"/g, ': <span class="token-string">"$1"</span>')
    // numbers
    .replace(/:\s*(-?\d+\.?\d*([eE][+-]?\d+)?)/g, ': <span class="token-number">$1</span>')
    // literals
    .replace(/:\s*(true|false|null)\b/g, ': <span class="token-literal">$1</span>')
    // brackets
    .replace(/([{}[\]])/g, '<span class="token-bracket">$1</span>');
}

function lineNumbers(text) {
  const n = text ? text.split('\n').length : 1;
  return Array.from({ length: n }, (_, i) => `<span>${i + 1}</span>`).join('');
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function JsonTool() {
  const [input, setInput]       = useState('');
  const [badge, setBadge]       = useState({ text: 'Valid', ok: true });
  const [status, setStatus]     = useState({ text: 'Ready to validate.', ok: true });

  const parse = (src) => {
    try { return { ok: true, data: JSON.parse(src) }; }
    catch (e) { return { ok: false, err: e.message }; }
  };

  const handleFormat = () => {
    const { ok, data, err } = parse(input);
    if (!ok) { setBadge({ text: 'Invalid', ok: false }); setStatus({ text: err, ok: false }); return; }
    const formatted = JSON.stringify(data, null, 2);
    setInput(formatted);
    setBadge({ text: 'Valid', ok: true });
    setStatus({ text: '✓ Formatted successfully.', ok: true });
  };

  const handleMinify = () => {
    const { ok, data, err } = parse(input);
    if (!ok) { setBadge({ text: 'Invalid', ok: false }); setStatus({ text: err, ok: false }); return; }
    setInput(JSON.stringify(data));
    setBadge({ text: 'Valid', ok: true });
    setStatus({ text: '✓ Minified successfully.', ok: true });
  };

  const handleValidate = () => {
    if (!input.trim()) { setBadge({ text: 'Valid', ok: true }); setStatus({ text: 'Ready to validate.', ok: true }); return; }
    const { ok, err } = parse(input);
    setBadge({ text: ok ? 'Valid' : 'Invalid', ok });
    setStatus({ text: ok ? '✓ Valid JSON.' : err, ok });
  };

  return (
    <div className="card">
      <div className="section-header">
        <h2>JSON linter &amp; formatter</h2>
        <div className={`status-badge ${badge.ok ? 'success' : 'error'}`}>{badge.text}</div>
      </div>

      <label>JSON input
        <div className="code-editor-shell">
          <div
            className="code-editor-gutter"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: lineNumbers(input) }}
          />
          <pre
            className="code-editor-highlight"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightJson(input) }}
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
        <button className="secondary-button" type="button" onClick={handleMinify}>Minify</button>
        <button className="secondary-button" type="button" onClick={handleValidate}>Validate</button>
      </div>

      <div className={`result-box ${status.ok ? 'success' : 'error'}`}>{status.text}</div>
    </div>
  );
}
