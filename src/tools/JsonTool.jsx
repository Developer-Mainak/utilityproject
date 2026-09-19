import { useState, useRef, useEffect } from 'react';

function getLineNumbers(text) {
  const count = text ? text.split('\n').length : 1;
  return Array.from({ length: count }, (_, i) => i + 1);
}

function lintJson(text) {
  if (!text || !text.trim()) {
    return { isValid: true, message: 'Ready to validate.', line: null, col: null, data: null };
  }
  try {
    const data = JSON.parse(text);
    const count = typeof data === 'object' && data !== null ? Object.keys(data).length : 1;
    return {
      isValid: true,
      message: `✓ Valid JSON (${count} root property${count === 1 ? '' : 'ies'}).`,
      line: null,
      col: null,
      data,
    };
  } catch (err) {
    let msg = err.message || 'Invalid JSON syntax';
    let line = null;
    let col = null;

    const posMatch = msg.match(/at position (\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const lines = text.slice(0, pos).split('\n');
      line = lines.length;
      col = lines[lines.length - 1].length + 1;
      msg = `Line ${line}, Col ${col}: ${msg}`;
    } else {
      const lineColMatch = msg.match(/line (\d+) column (\d+)/i);
      if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        col = parseInt(lineColMatch[2], 10);
        msg = `Line ${line}, Col ${col}: ${msg}`;
      }
    }

    return { isValid: false, message: msg, line, col, data: null };
  }
}

export default function JsonTool() {
  const [input, setInput]   = useState('');
  const [status, setStatus] = useState({ isValid: true, message: 'Ready to validate.' });
  const [copied, setCopied] = useState(false);
  const gutterRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync gutter scroll with textarea
  const handleScroll = (e) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    const result = lintJson(val);
    setStatus({ isValid: result.isValid, message: result.message });
  };

  const handleFormat = () => {
    const result = lintJson(input);
    if (!result.isValid || result.data === null) {
      setStatus({ isValid: false, message: result.message || 'Cannot format invalid JSON.' });
      return;
    }
    const formatted = JSON.stringify(result.data, null, 2);
    setInput(formatted);
    setStatus({ isValid: true, message: '✓ Formatted successfully (2-space indent).' });
  };

  const handleMinify = () => {
    const result = lintJson(input);
    if (!result.isValid || result.data === null) {
      setStatus({ isValid: false, message: result.message || 'Cannot minify invalid JSON.' });
      return;
    }
    const minified = JSON.stringify(result.data);
    setInput(minified);
    setStatus({ isValid: true, message: '✓ Minified successfully.' });
  };

  const handleValidate = () => {
    const result = lintJson(input);
    setStatus({ isValid: result.isValid, message: result.message });
  };

  const handleCopy = async () => {
    if (!input) return;
    await navigator.clipboard.writeText(input);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const lines = getLineNumbers(input);

  return (
    <div className="card">
      <div className="section-header">
        <h2>JSON linter &amp; formatter</h2>
        <div className={`status-badge ${status.isValid ? 'success' : 'error'}`}>
          {status.isValid ? 'Valid' : 'Invalid'}
        </div>
      </div>

      <label>
        JSON input
        <div className="code-editor-shell">
          <div
            ref={gutterRef}
            className="code-editor-gutter"
            aria-hidden="true"
          >
            {lines.map((num) => (
              <span key={num}>{num}</span>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className="code-editor-input"
            rows="12"
            spellCheck="false"
            value={input}
            onChange={handleInputChange}
            onScroll={handleScroll}
            placeholder='Paste or type JSON here, e.g. {"key": "value"}'
          />
        </div>
      </label>

      <div className="action-row">
        <button className="primary-button" type="button" onClick={handleFormat}>
          Format
        </button>
        <button className="secondary-button" type="button" onClick={handleMinify}>
          Minify
        </button>
        <button className="secondary-button" type="button" onClick={handleValidate}>
          Validate
        </button>
        <button className="secondary-button" type="button" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>

      <div className={`result-box ${status.isValid ? 'success' : 'error'}`}>
        {status.message}
      </div>
    </div>
  );
}
