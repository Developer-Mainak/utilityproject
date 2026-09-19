import { useState, useMemo } from 'react';

/* ── Case Conversion Helpers ─────────────────────────────────────────────── */
function toTitleCase(str) {
  return str.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function toSentenceCase(str) {
  return str.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
}

function toWords(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .trim()
    .split(/\s+/);
}

function toCamelCase(str) {
  const words = toWords(str);
  if (!words.length || !words[0]) return '';
  return words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}

function toPascalCase(str) {
  return toWords(str)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function toSnakeCase(str) {
  return toWords(str)
    .map((w) => w.toLowerCase())
    .join('_');
}

function toKebabCase(str) {
  return toWords(str)
    .map((w) => w.toLowerCase())
    .join('-');
}

function toConstantCase(str) {
  return toWords(str)
    .map((w) => w.toUpperCase())
    .join('_');
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ── Cleaning & Formatting Helpers ────────────────────────────────────────── */
function cleanExtraSpaces(str) {
  return str
    .split('\n')
    .map((line) => line.trim().replace(/[ \t]+/g, ' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function removeLineBreaks(str) {
  return str.replace(/(\r\n|\n|\r)+/gm, ' ').replace(/[ \t]+/g, ' ').trim();
}

function removeDuplicateLines(str) {
  const lines = str.split('\n');
  const seen = new Set();
  const result = [];
  for (const line of lines) {
    if (!seen.has(line)) {
      seen.add(line);
      result.push(line);
    }
  }
  return result.join('\n');
}

function sortLinesAsc(str) {
  return str
    .split('\n')
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .join('\n');
}

function sortLinesDesc(str) {
  return str
    .split('\n')
    .sort((a, b) => b.localeCompare(a, undefined, { sensitivity: 'base' }))
    .join('\n');
}

function reverseText(str) {
  return Array.from(str).reverse().join('');
}

export default function TextTool() {
  const [text, setText]                 = useState('The quick brown fox jumps over the lazy dog. Smart developer utilities make everyday work fast and effortless!');
  const [history, setHistory]           = useState([]);
  const [copied, setCopied]             = useState(false);

  // Find and Replace state
  const [findStr, setFindStr]           = useState('');
  const [replaceStr, setReplaceStr]     = useState('');
  const [matchCase, setMatchCase]       = useState(false);
  const [replaceStatus, setReplaceStatus] = useState('');

  // Apply transformation and push to undo history
  const applyTransform = (fn) => {
    setHistory((prev) => [...prev.slice(-10), text]);
    setText((prevText) => fn(prevText));
    setReplaceStatus('');
  };

  const handleUndo = () => {
    if (!history.length) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setText(last);
  };

  const handleCopy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleFindReplace = () => {
    if (!findStr) {
      setReplaceStatus('Please enter text to find.');
      return;
    }
    setHistory((prev) => [...prev.slice(-10), text]);

    try {
      const flags = matchCase ? 'g' : 'gi';
      const escaped = findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, flags);
      const matches = (text.match(regex) || []).length;
      const newText = text.replace(regex, replaceStr);
      setText(newText);
      setReplaceStatus(`✓ Replaced ${matches} occurrence${matches === 1 ? '' : 's'}.`);
    } catch {
      setReplaceStatus('Invalid search pattern.');
    }
  };

  const handleLoadSample = () => {
    setText('NotJustPDF developer tools\nBase64 encoding and decoding\nPDF compression and merging\nJSON linter and formatter\nXML validator\nQR code generator and scanner');
  };

  // Comprehensive Text Statistics
  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const charsTotal = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const lines = text ? text.split('\n').length : 0;
    const paragraphs = trimmed ? trimmed.split(/\n\s*\n+/).length : 0;

    // Reading time: avg 200 words/min; Speaking time: avg 130 words/min
    const readMinutes = (words / 200).toFixed(1);
    const speakMinutes = (words / 130).toFixed(1);

    return {
      words,
      charsTotal,
      charsNoSpaces,
      lines,
      paragraphs,
      readTime: `${readMinutes} min`,
      speakTime: `${speakMinutes} min`,
    };
  }, [text]);

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h2>Text Studio</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
            Case conversion, formatting, find &amp; replace, and live typography analytics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="secondary-button small"
            type="button"
            onClick={handleUndo}
            disabled={!history.length}
            title="Undo last transformation"
          >
            ↩ Undo
          </button>
          <button
            className="secondary-button small"
            type="button"
            onClick={handleLoadSample}
          >
            Sample
          </button>
          <button
            className="secondary-button small"
            type="button"
            onClick={() => setText('')}
          >
            Clear
          </button>
        </div>
      </div>

      <label>
        Enter or paste text
        <textarea
          rows="9"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste your text here…"
          spellCheck="false"
        />
      </label>

      {/* ── Section 1: Case Conversions ────────────────────────────────────── */}
      <div className="sub-section-title">Case Conversions</div>
      <div className="btn-matrix">
        <button type="button" onClick={() => applyTransform((s) => s.toUpperCase())}>
          UPPERCASE
        </button>
        <button type="button" onClick={() => applyTransform((s) => s.toLowerCase())}>
          lowercase
        </button>
        <button type="button" onClick={() => applyTransform(toTitleCase)}>
          Title Case
        </button>
        <button type="button" onClick={() => applyTransform(toSentenceCase)}>
          Sentence case
        </button>
        <button type="button" onClick={() => applyTransform(toCamelCase)}>
          camelCase
        </button>
        <button type="button" onClick={() => applyTransform(toSnakeCase)}>
          snake_case
        </button>
        <button type="button" onClick={() => applyTransform(toKebabCase)}>
          kebab-case
        </button>
        <button type="button" onClick={() => applyTransform(toPascalCase)}>
          PascalCase
        </button>
        <button type="button" onClick={() => applyTransform(toConstantCase)}>
          CONSTANT_CASE
        </button>
      </div>

      {/* ── Section 2: Whitespace & Line Formatting ───────────────────────── */}
      <div className="sub-section-title">Whitespace &amp; Lines</div>
      <div className="btn-matrix">
        <button type="button" onClick={() => applyTransform(cleanExtraSpaces)}>
          Clean Extra Spaces
        </button>
        <button type="button" onClick={() => applyTransform(removeLineBreaks)}>
          Remove Line Breaks
        </button>
        <button type="button" onClick={() => applyTransform(removeDuplicateLines)}>
          Remove Duplicate Lines
        </button>
        <button type="button" onClick={() => applyTransform(sortLinesAsc)}>
          Sort Lines (A → Z)
        </button>
        <button type="button" onClick={() => applyTransform(sortLinesDesc)}>
          Sort Lines (Z → A)
        </button>
        <button type="button" onClick={() => applyTransform(reverseText)}>
          Reverse Characters
        </button>
        <button type="button" onClick={() => applyTransform(slugify)}>
          Slugify (URL-Friendly)
        </button>
      </div>

      {/* ── Section 3: Find & Replace ──────────────────────────────────────── */}
      <div className="sub-section-title">Find &amp; Replace</div>
      <div className="find-replace-grid">
        <input
          type="text"
          placeholder="Find text…"
          value={findStr}
          onChange={(e) => setFindStr(e.target.value)}
        />
        <input
          type="text"
          placeholder="Replace with…"
          value={replaceStr}
          onChange={(e) => setReplaceStr(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label className="checkbox-inline" style={{ margin: 0, fontSize: '0.8rem' }}>
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
            />
            Match Case
          </label>
          <button className="primary-button small" type="button" onClick={handleFindReplace}>
            Replace All
          </button>
        </div>
      </div>
      {replaceStatus && (
        <div style={{ fontSize: '0.8rem', color: replaceStatus.startsWith('✓') ? 'var(--green)' : 'var(--amber)', marginBottom: '8px' }}>
          {replaceStatus}
        </div>
      )}

      {/* ── Section 4: Typography Statistics ───────────────────────────────── */}
      <div className="stats-grid-6">
        <div className="stat-box-compact">
          <span>Words</span>
          <strong>{stats.words}</strong>
        </div>
        <div className="stat-box-compact">
          <span>Characters</span>
          <strong>{stats.charsTotal}</strong>
        </div>
        <div className="stat-box-compact">
          <span>No Spaces</span>
          <strong>{stats.charsNoSpaces}</strong>
        </div>
        <div className="stat-box-compact">
          <span>Lines</span>
          <strong>{stats.lines}</strong>
        </div>
        <div className="stat-box-compact">
          <span>Paragraphs</span>
          <strong>{stats.paragraphs}</strong>
        </div>
        <div className="stat-box-compact">
          <span>Reading</span>
          <small>{stats.readTime}</small>
        </div>
        <div className="stat-box-compact">
          <span>Speaking</span>
          <small>{stats.speakTime}</small>
        </div>
      </div>

      <div className="action-row compact" style={{ marginTop: '16px' }}>
        <button className="primary-button" type="button" onClick={handleCopy}>
          {copied ? '✓ Copied to Clipboard!' : 'Copy Result'}
        </button>
      </div>
    </div>
  );
}
