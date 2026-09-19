import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

export default function QrTool() {
  const [qrText, setQrText]       = useState('https://notjustpdf.dev');
  const [scanResult, setScanResult] = useState({ text: 'Waiting for QR input.', ok: true });
  const canvasRef = useRef(null);

  /* generate on mount with default text */
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, 'https://notjustpdf.dev', { width: 220, margin: 1 }).catch(() => {});
    }
  }, []);

  const handleGenerate = async () => {
    if (!canvasRef.current) return;
    try {
      await QRCode.toCanvas(canvasRef.current, qrText || ' ', { width: 220, margin: 1 });
    } catch (e) {
      console.error('QR generation failed', e);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    Object.assign(document.createElement('a'), {
      href: canvas.toDataURL('image/png'),
      download: 'qrcode.png',
    }).click();
  };

  const handleScan = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
        canvas.getContext('2d').drawImage(img, 0, 0);
        const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        setScanResult(code
          ? { text: code.data, ok: true }
          : { text: 'No QR code found in image.', ok: false }
        );
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="card">
      <div className="section-header">
        <h2>QR code generator &amp; scanner</h2>
        <div className="status-badge success">File upload</div>
      </div>

      <div className="tool-grid qr-tool-grid">
        {/* Generate */}
        <div className="mini-card">
          <h3>Generate QR</h3>
          <label>Text or URL
            <textarea rows="5" value={qrText} onChange={(e) => setQrText(e.target.value)} />
          </label>
          <div className="action-row compact">
            <button className="primary-button small"   type="button" onClick={handleGenerate}>Generate</button>
            <button className="secondary-button small" type="button" onClick={handleDownload}>Download PNG</button>
          </div>
          <div className="qr-output-wrap">
            <canvas ref={canvasRef} id="qr-output" width="220" height="220" />
          </div>
        </div>

        {/* Scan */}
        <div className="mini-card">
          <h3>Scan QR from file</h3>
          <div className="upload-box">
            <input type="file" accept="image/*" onChange={handleScan} />
          </div>
          <div id="qr-result" className={`result-box ${scanResult.ok ? 'success' : 'error'}`}>
            {scanResult.text}
          </div>
        </div>
      </div>
    </div>
  );
}
