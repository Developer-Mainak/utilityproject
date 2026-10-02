import { useState, useEffect } from 'react';
import Base64Tool from './tools/Base64Tool';
import PdfStudioTool from './tools/PdfStudioTool';
import ImageTool from './tools/ImageTool';
import TextTool from './tools/TextTool';
import JsonTool from './tools/JsonTool';
import XmlTool from './tools/XmlTool';
import QrTool from './tools/QrTool';
import EssentialsTool from './tools/EssentialsTool';

const NAV = [
  { id: 'base64',     label: 'Base64',      dot: 'cyan'   },
  { id: 'pdf-tools',  label: 'PDF Studio',  dot: 'purple' },
  { id: 'media',      label: 'Media Tools', dot: 'orange' },
  { id: 'text-tools', label: 'Text Tools',  dot: 'green'  },
  { id: 'json',       label: 'JSON',        dot: 'amber'  },
  { id: 'xml',        label: 'XML',         dot: 'pink'   },
  { id: 'qr-tools',   label: 'QR Tools',   dot: 'orange' },
  { id: 'essentials', label: 'Utilities',  dot: 'red'    },
];

const PANELS = {
  'base64':     Base64Tool,
  'pdf-tools':  PdfStudioTool,
  'media':      ImageTool,
  'text-tools': TextTool,
  'json':       JsonTool,
  'xml':        XmlTool,
  'qr-tools':   QrTool,
  'essentials': EssentialsTool,
};

export default function App() {
  const [active, setActive] = useState('base64');
  const [theme, setTheme] = useState(
    () => localStorage.getItem('notjustpdf-theme') || 'dark'
  );

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('notjustpdf-theme', theme);
  }, [theme]);

  const ActivePanel = PANELS[active];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <div className="brand-title">NotJustPDF</div>
            <div className="brand-subtitle">Smart tools for PDFs &amp; devs</div>
          </div>
        </div>

        <nav className="nav-stack">
          {NAV.map(({ id, label, dot }) => (
            <button
              key={id}
              className={`nav-item${active === id ? ' active' : ''}`}
              type="button"
              onClick={() => setActive(id)}
            >
              <span className={`dot ${dot}`} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="content-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Everything in one place</p>
            <h1>NotJustPDF — smarter file tools for work</h1>
            <p className="subhead">
              100% browser-native. Files stay local in your browser, no uploads, no server storage, and no data retention.
            </p>
          </div>
          <div className="header-actions">
            <div className="pill-toggle theme-toggle" aria-label="Theme selector">
              <button
                className={`mode-button${theme === 'dark' ? ' active' : ''}`}
                type="button"
                onClick={() => setTheme('dark')}
              >
                Dark
              </button>
              <button
                className={`mode-button${theme === 'light' ? ' active' : ''}`}
                type="button"
                onClick={() => setTheme('light')}
              >
                Light
              </button>
            </div>
          </div>
        </header>

        <section className="seo-intro" aria-labelledby="toolkit-overview">
          <h2 id="toolkit-overview">Free browser-based developer tools — no uploads, no data stored</h2>
          <p>
            Encode &amp; decode Base64 (including PDFs), convert images to PDF, validate JSON &amp; XML,
            generate QR codes, resize images — all in your browser with zero file uploads.
          </p>
          <div className="seo-tool-chips" aria-label="Available tools">
            <span className="seo-chip seo-chip--cyan"><h3>Base64 Encoder &amp; Decoder</h3></span>
            <span className="seo-chip seo-chip--purple"><h3>Base64 PDF Converter</h3></span>
            <span className="seo-chip seo-chip--purple"><h3>Image to PDF Generator</h3></span>
            <span className="seo-chip seo-chip--amber"><h3>JSON Validator &amp; Formatter</h3></span>
            <span className="seo-chip seo-chip--pink"><h3>XML Validator &amp; Formatter</h3></span>
            <span className="seo-chip seo-chip--orange"><h3>QR Code Generator &amp; Scanner</h3></span>
            <span className="seo-chip seo-chip--orange"><h3>Image Resizer &amp; Converter</h3></span>
            <span className="seo-chip seo-chip--green"><h3>Text &amp; URL Utilities</h3></span>
          </div>
        </section>

        {ActivePanel && <ActivePanel />}
      </main>
    </div>
  );
}
