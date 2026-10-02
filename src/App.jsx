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
            NotJustPDF is a free online toolkit for developers and everyday users. Encode and decode
            Base64 (including PDF files), convert images to PDF, validate JSON and XML, generate QR codes,
            resize images, and run text utilities — all 100% in your browser with zero file uploads.
          </p>

          <div className="seo-feature-grid" aria-label="Available tools">
            <article className="seo-feature-card">
              <h3>Base64 Encoder &amp; Decoder Online</h3>
              <p>
                Encode any text to Base64 or decode a Base64 string back to plaintext instantly.
                Supports UTF-8, URL-safe (RFC 4648), MIME line-wrapping (64/76 chars), and
                file-to-Base64 Data URI conversion — including PDF, images, fonts, and audio.
              </p>
            </article>

            <article className="seo-feature-card">
              <h3>Base64 PDF Converter — Encode PDF to Base64</h3>
              <p>
                Upload any PDF file and instantly get its Base64 encoded string or full Data URI.
                Ideal for embedding PDFs in JSON APIs, HTML email, or web applications without
                a file server. No upload — the conversion runs entirely in your browser.
              </p>
            </article>

            <article className="seo-feature-card">
              <h3>Image to PDF Generator — JPG, PNG, WEBP to PDF</h3>
              <p>
                Combine one or more images into a high-quality multi-page PDF. Supports JPG, PNG,
                WEBP, and GIF. Drag to reorder pages, then download the PDF instantly.
                Free, private, and no account required.
              </p>
            </article>

            <article className="seo-feature-card">
              <h3>JSON Validator &amp; Formatter</h3>
              <p>
                Paste raw JSON and validate its structure in real time. Pretty-print with
                configurable indentation, minify, and spot syntax errors with highlighted line
                numbers. Works offline after first load.
              </p>
            </article>

            <article className="seo-feature-card">
              <h3>XML Validator &amp; Pretty-Printer</h3>
              <p>
                Validate and format XML documents directly in your browser. Detect malformed tags,
                unclosed elements, and encoding issues instantly — no server, no extensions needed.
              </p>
            </article>

            <article className="seo-feature-card">
              <h3>QR Code Generator &amp; Scanner</h3>
              <p>
                Generate QR codes from any URL, text, or data string and download as PNG.
                Also scan QR codes from an uploaded image file — no camera permission required.
                Completely free and private.
              </p>
            </article>

            <article className="seo-feature-card">
              <h3>Image Resizer &amp; Format Converter</h3>
              <p>
                Resize images to exact pixel dimensions, convert between JPG, PNG, and WEBP,
                and adjust quality — all client-side. Your photos never leave your device.
              </p>
            </article>

            <article className="seo-feature-card">
              <h3>Text &amp; URL Utilities</h3>
              <p>
                URL encode and decode, convert text case (uppercase, lowercase, title case),
                count words and characters, generate hashes (MD5, SHA-256), and diff two text blocks
                — a complete text toolkit in one place.
              </p>
            </article>
          </div>
        </section>

        {ActivePanel && <ActivePanel />}
      </main>
    </div>
  );
}
