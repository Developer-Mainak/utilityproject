import { useState, useMemo } from 'react';

const titleCase = (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
const cleanSpaces = (s) => s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

export default function TextTool() {
  const [text, setText]   = useState('Write your text here and transform it instantly.');
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => ({
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    chars: text.length,
    lines: text ? text.split('\n').length : 0,
  }), [text]);

  const apply = (fn) => setText(fn(text));

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="card">
      <div className="section-header"><h2>Text utilities</h2></div>

      <label>Enter text
        <textarea rows="12" value={text} onChange={(e) => setText(e.target.value)} />
      </label>

      <div className="action-row">
        <button className="primary-button"   type="button" onClick={() => apply((s) => s.toUpperCase())}>UPPERCASE</button>
        <button className="secondary-button" type="button" onClick={() => apply((s) => s.toLowerCase())}>lowercase</button>
        <button className="secondary-button" type="button" onClick={() => apply(titleCase)}>Title Case</button>
        <button className="secondary-button" type="button" onClick={() => apply(cleanSpaces)}>Clean Spaces</button>
      </div>

      <div className="stats-grid">
        <div className="stat-box"><span>Words</span><strong>{stats.words}</strong></div>
        <div className="stat-box"><span>Characters</span><strong>{stats.chars}</strong></div>
        <div className="stat-box"><span>Lines</span><strong>{stats.lines}</strong></div>
      </div>

      <div className="action-row compact">
        <button className="secondary-button" type="button" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy result'}
        </button>
      </div>
    </div>
  );
}
