import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

export default function QrTool() {
  // ── Generate QR state ─────────────────────────────────────────────────────
  const [qrText, setQrText]       = useState('https://notjustpdf.vercel.app');
  const generateCanvasRef         = useRef(null);

  // ── Scan QR state ─────────────────────────────────────────────────────────
  const [scanFile, setScanFile]         = useState(null);
  const [scanResult, setScanResult]     = useState(null); // { text, ok }
  const [copied, setCopied]             = useState(false);
  const [isScanning, setIsScanning]     = useState(false);
  const [hasImage, setHasImage]         = useState(false);
  const scanCanvasRef                   = useRef(null);

  // Generate initial QR on mount
  useEffect(() => {
    if (generateCanvasRef.current) {
      QRCode.toCanvas(generateCanvasRef.current, qrText, {
        width: 220,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      }).catch(() => {});
    }
  }, []);

  const handleGenerate = async () => {
    if (!generateCanvasRef.current) return;
    try {
      await QRCode.toCanvas(generateCanvasRef.current, qrText || ' ', {
        width: 220,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });
    } catch (e) {
      console.error('QR generation failed', e);
    }
  };

  const handleDownload = () => {
    const canvas = generateCanvasRef.current;
    if (!canvas) return;
    const a = Object.assign(document.createElement('a'), {
      href: canvas.toDataURL('image/png'),
      download: 'qrcode.png',
    });
    a.click();
  };

  // ── Scan QR from file ─────────────────────────────────────────────────────
  const processQrImage = (file) => {
    if (!file) return;
    setScanFile(file);
    setIsScanning(true);
    setScanResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setHasImage(true);
        const canvas = scanCanvasRef.current;
        if (!canvas) {
          setIsScanning(false);
          return;
        }

        // Set display canvas dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Try reading at native resolution
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        // If not found and image is large (> 1000px), downscale to ~800px where jsQR excels
        if (!code && (img.width > 1000 || img.height > 1000)) {
          const maxDim = 800;
          const scale = Math.min(maxDim / img.width, maxDim / img.height);
          const scaledW = Math.round(img.width * scale);
          const scaledH = Math.round(img.height * scale);

          const offscreen = document.createElement('canvas');
          offscreen.width = scaledW;
          offscreen.height = scaledH;
          const offCtx = offscreen.getContext('2d');
          offCtx.drawImage(img, 0, 0, scaledW, scaledH);

          const scaledData = offCtx.getImageData(0, 0, scaledW, scaledH);
          code = jsQR(scaledData.data, scaledData.width, scaledData.height, {
            inversionAttempts: 'attemptBoth',
          });
        }

        if (code) {
          // Draw highlight bounding box around detected QR code
          ctx.lineWidth = Math.max(4, Math.round(canvas.width / 150));
          ctx.strokeStyle = '#22d3ee';
          ctx.fillStyle = 'rgba(34, 211, 238, 0.15)';

          const loc = code.location;
          ctx.beginPath();
          ctx.moveTo(loc.topLeftCorner.x, loc.topLeftCorner.y);
          ctx.lineTo(loc.topRightCorner.x, loc.topRightCorner.y);
          ctx.lineTo(loc.bottomRightCorner.x, loc.bottomRightCorner.y);
          ctx.lineTo(loc.bottomLeftCorner.x, loc.bottomLeftCorner.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          setScanResult({ text: code.data, ok: true });
        } else {
          setScanResult({
            text: 'No QR code detected. Please ensure the QR code is clearly visible and in focus.',
            ok: false,
          });
        }
        setIsScanning(false);
      };
      img.onerror = () => {
        setScanResult({ text: 'Failed to load image file.', ok: false });
        setIsScanning(false);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCopyScanned = async () => {
    if (!scanResult?.text || !scanResult.ok) return;
    await navigator.clipboard.writeText(scanResult.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isUrl = scanResult?.ok && /^(https?:\/\/)/i.test(scanResult.text.trim());

  return (
    <div className="card">
      <div className="section-header">
        <h2>QR code generator &amp; scanner</h2>
        <div className="status-badge success">Client-side</div>
      </div>

      <div className="tool-grid qr-tool-grid">
        {/* ── Generate QR ─────────────────────────────────────────────────── */}
        <div className="mini-card">
          <h3>Generate QR</h3>
          <label>
            Text or URL
            <textarea
              rows="4"
              value={qrText}
              onChange={(e) => setQrText(e.target.value)}
              placeholder="Enter text or URL to generate QR"
            />
          </label>
          <div className="action-row compact">
            <button className="primary-button small" type="button" onClick={handleGenerate}>
              Generate
            </button>
            <button className="secondary-button small" type="button" onClick={handleDownload}>
              Download PNG
            </button>
          </div>
          <div className="qr-output-wrap">
            <canvas ref={generateCanvasRef} id="qr-output" width="220" height="220" />
          </div>
        </div>

        {/* ── Scan QR from file ───────────────────────────────────────────── */}
        <div className="mini-card">
          <h3>Scan QR from file</h3>
          <div className="upload-box">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processQrImage(file);
              }}
            />
          </div>

          <div className="scanner-box">
            <canvas
              ref={scanCanvasRef}
              className="scanner-canvas"
              style={{ display: hasImage ? 'block' : 'none' }}
            />
            {!hasImage && (
              <div className="scanner-placeholder">
                {isScanning ? 'Processing image…' : 'Upload an image above to scan and preview the QR code.'}
              </div>
            )}
          </div>

          {scanResult && (
            <div className="qr-scan-decoded">
              <div className={`status-badge ${scanResult.ok ? 'success' : 'error'}`}>
                {scanResult.ok ? '✓ QR Code Detected' : 'Scan Failed'}
              </div>

              {scanResult.ok ? (
                <>
                  <textarea
                    rows="3"
                    readOnly
                    value={scanResult.text}
                    className="code-block-output"
                  />
                  <div className="action-row compact">
                    <button className="primary-button small" type="button" onClick={handleCopyScanned}>
                      {copied ? 'Copied!' : 'Copy Decoded Text'}
                    </button>
                    {isUrl && (
                      <a
                        href={scanResult.text.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="secondary-button small"
                        style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                      >
                        Open URL ↗
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="result-box error">
                  {scanResult.text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
