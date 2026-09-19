import { useState, useRef } from 'react';

function getLineNumbers(text) {
  const count = text ? text.split('\n').length : 1;
  return Array.from({ length: count }, (_, i) => i + 1);
}

function lintXml(src) {
  if (!src || !src.trim()) {
    return { isValid: true, message: 'Ready to validate.', doc: null };
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(src.trim(), 'application/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      const rawMsg = parserError.textContent || 'Invalid XML syntax.';
      const cleanMsg = rawMsg.split('\n')[0].trim();
      return { isValid: false, message: cleanMsg || 'Invalid XML syntax.', doc: null };
    }
    return { isValid: true, message: '✓ Valid XML syntax.', doc };
  } catch (err) {
    return { isValid: false, message: err.message || 'XML parsing error.', doc: null };
  }
}

function formatXml(src) {
  const result = lintXml(src);
  if (!result.isValid) throw new Error(result.message);

  const serializer = new XMLSerializer();
  const raw = serializer.serializeToString(result.doc);

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
      if (
        line.startsWith('<') &&
        !line.startsWith('<?') &&
        !line.startsWith('<!') &&
        !line.endsWith('/>') &&
        !line.includes('</')
      ) {
        indent += 1;
      }
      return out;
    })
    .filter(Boolean);

  return lines.join('\n');
}

function minifyXml(src) {
  const result = lintXml(src);
  if (!result.isValid) throw new Error(result.message);

  const serializer = new XMLSerializer();
  const raw = serializer.serializeToString(result.doc);
  return raw.replace(/>\s+</g, '><').trim();
}

export default function XmlTool() {
  const [input, setInput]   = useState('');
  const [status, setStatus] = useState({ isValid: true, message: 'Ready to validate.' });
  const [copied, setCopied] = useState(false);
  const gutterRef = useRef(null);
  const textareaRef = useRef(null);

  const handleScroll = (e) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    const result = lintXml(val);
    setStatus({ isValid: result.isValid, message: result.message });
  };

  const handleFormat = () => {
    try {
      const formatted = formatXml(input);
      setInput(formatted);
      setStatus({ isValid: true, message: '✓ Formatted successfully (2-space indent).' });
    } catch (e) {
      setStatus({ isValid: false, message: e.message || 'Cannot format invalid XML.' });
    }
  };

  const handleMinify = () => {
    try {
      const minified = minifyXml(input);
      setInput(minified);
      setStatus({ isValid: true, message: '✓ Minified successfully.' });
    } catch (e) {
      setStatus({ isValid: false, message: e.message || 'Cannot minify invalid XML.' });
    }
  };

  const handleValidate = () => {
    const result = lintXml(input);
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
        <h2>XML validator &amp; formatter</h2>
        <div className={`status-badge ${status.isValid ? 'success' : 'error'}`}>
          {status.isValid ? 'Valid' : 'Invalid'}
        </div>
      </div>

      <label>
        XML input
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
            placeholder='Paste or type XML here, e.g. <root><child>value</child></root>'
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
          {copied ? 'Copied!' : 'Copy XML'}
        </button>
      </div>

      <div className={`result-box ${status.isValid ? 'success' : 'error'}`}>
        {status.message}
      </div>
    </div>
  );
}
