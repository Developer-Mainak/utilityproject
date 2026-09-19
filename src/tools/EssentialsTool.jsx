import { useState } from 'react';

/* ── Color helpers ────────────────────────────────────────────────────────── */
function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  const full  = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (full.length !== 6) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return isNaN(r + g + b) ? null : { r, g, b };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r:  h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g:  h = ((b - r) / d + 2) / 6;               break;
    default: h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function EssentialsTool() {
  const [urlInput,   setUrlInput]   = useState('https://example.com/search?q=hello world');
  const [urlOutput,  setUrlOutput]  = useState('');
  const [uuid,       setUuid]       = useState('');
  const [uuidCopied, setUuidCopied] = useState(false);
  const [colorInput, setColorInput] = useState('#7c3aed');
  const [colorOut,   setColorOut]   = useState('');
  const [colorPreview, setColorPreview] = useState('#7c3aed');
  const [tsInput,    setTsInput]    = useState('1695148800');
  const [tsOutput,   setTsOutput]   = useState('');

  /* URL */
  const encodeUrl = () => { try { setUrlOutput(encodeURIComponent(urlInput)); } catch { setUrlOutput('Encoding error'); } };
  const decodeUrl = () => { try { setUrlOutput(decodeURIComponent(urlInput)); } catch { setUrlOutput('Invalid encoded string'); } };

  /* UUID */
  const genUuid = () => setUuid(crypto.randomUUID());
  const copyUuid = async () => {
    if (!uuid) return;
    await navigator.clipboard.writeText(uuid);
    setUuidCopied(true);
    setTimeout(() => setUuidCopied(false), 1500);
  };

  /* Color */
  const convertColor = () => {
    const rgb = hexToRgb(colorInput);
    if (!rgb) { setColorOut('Invalid hex color (use #rrggbb or #rgb)'); return; }
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    setColorPreview(colorInput.trim());
    setColorOut(
      `HEX : ${colorInput.trim()}\nRGB : rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\nHSL : hsl(${hsl.h}deg, ${hsl.s}%, ${hsl.l}%)`
    );
  };

  /* Timestamp */
  const toDate = () => {
    const ts = Number(tsInput);
    setTsOutput(isNaN(ts) ? 'Invalid number' : new Date(ts * 1000).toString());
  };
  const toUnix = () => {
    const d = new Date(tsInput);
    setTsOutput(isNaN(d.getTime()) ? 'Invalid date string' : String(Math.floor(d.getTime() / 1000)));
  };

  return (
    <div className="card">
      <div className="section-header"><h2>Developer essentials</h2></div>

      <div className="tool-grid">
        {/* URL encoder / decoder */}
        <div className="mini-card">
          <h3>URL encoder / decoder</h3>
          <textarea rows="5" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
          <div className="action-row compact">
            <button className="primary-button small"   type="button" onClick={encodeUrl}>Encode</button>
            <button className="secondary-button small" type="button" onClick={decodeUrl}>Decode</button>
          </div>
          <textarea rows="4" readOnly value={urlOutput} />
        </div>

        {/* UUID generator */}
        <div className="mini-card">
          <h3>UUID generator</h3>
          <div className="action-row compact">
            <button className="primary-button small"   type="button" onClick={genUuid}>Generate</button>
            <button className="secondary-button small" type="button" onClick={copyUuid}>
              {uuidCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea rows="3" readOnly value={uuid} />
        </div>

        {/* Color converter */}
        <div className="mini-card">
          <h3>Color converter</h3>
          <input type="text" value={colorInput} onChange={(e) => setColorInput(e.target.value)} />
          <div className="color-preview-wrap">
            <div className="color-preview" style={{ background: colorPreview }} />
          </div>
          <div className="action-row compact">
            <button className="primary-button small" type="button" onClick={convertColor}>Convert</button>
          </div>
          <textarea rows="4" readOnly value={colorOut} />
        </div>

        {/* Timestamp converter */}
        <div className="mini-card">
          <h3>Timestamp converter</h3>
          <input type="text" value={tsInput} onChange={(e) => setTsInput(e.target.value)} />
          <div className="action-row compact">
            <button className="primary-button small"   type="button" onClick={toDate}>To Date</button>
            <button className="secondary-button small" type="button" onClick={toUnix}>To Unix</button>
          </div>
          <textarea rows="3" readOnly value={tsOutput} />
        </div>
      </div>
    </div>
  );
}
