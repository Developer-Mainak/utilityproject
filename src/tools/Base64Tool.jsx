import { useState, useCallback } from 'react';

function encode(value) {
  if (!value) return '';
  try { return btoa(unescape(encodeURIComponent(value))); }
  catch { return 'Encoding error'; }
}

function decode(value) {
  if (!value) return '';
  try { return decodeURIComponent(escape(atob(value.replace(/\s/g, '')))); }
  catch { return 'Invalid Base64 input'; }
}

export default function Base64Tool() {
  const [mode, setMode]     = useState('encode');
  const [input, setInput]   = useState('hello world');
  const [output, setOutput] = useState('aGVsbG8gd29ybGQ=');
  const [copied, setCopied] = useState(false);

  const run = useCallback((val, m) => (m === 'encode' ? encode(val) : decode(val)), []);

  const switchMode = (m) => { setMode(m); setOutput(run(input, m)); };
  const handleInput = (e) => { setInput(e.target.value); if (mode === 'encode') setOutput(encode(e.target.value)); };
  const handleAction = () => setOutput(run(input, mode));

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="card">
      <div className="section-header">
        <h2>Base64 encoder / decoder</h2>
        <div className="pill-toggle">
          <button className={`mode-button${mode === 'encode' ? ' active' : ''}`} type="button" onClick={() => switchMode('encode')}>Encode</button>
          <button className={`mode-button${mode === 'decode' ? ' active' : ''}`} type="button" onClick={() => switchMode('decode')}>Decode</button>
        </div>
      </div>

      <div className="stacked-fields">
        <label>Input
          <textarea className="code-block-input" rows="8" value={input} onChange={handleInput} />
        </label>
        <label>Output
          <textarea className="code-block-output" rows="8" readOnly value={output} />
        </label>
      </div>

      <div className="action-row">
        <button className="primary-button" type="button" onClick={handleAction}>
          {mode === 'encode' ? 'Encode' : 'Decode'}
        </button>
        <button className="secondary-button" type="button" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy output'}
        </button>
      </div>
    </div>
  );
}
