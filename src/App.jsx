import { useState } from 'react';
import { jsPDF } from 'jspdf';

const tabs = [
  { id: 'base64', label: 'Base64', accent: 'cyan' },
  { id: 'images', label: 'Image to PDF', accent: 'purple' },
  { id: 'json', label: 'JSON', accent: 'green' },
  { id: 'xml', label: 'XML', accent: 'amber' },
  { id: 'syntax', label: 'Syntax', accent: 'pink' },
];

const initialJson = `{
  "project": "DevToolBox",
  "features": [
    "base64",
    "image-to-pdf",
    "linting"
  ],
  "status": "ready"
}`;

const initialXml = `<?xml version="1.0" encoding="UTF-8"?>
<project name="Toolbox">
  <feature>JSON</feature>
  <feature>XML</feature>
  <feature>PDF</feature>
</project>`;

const initialCode = `const user = {
  name: 'Alex',
  role: 'developer',
};

const greet = (person) => 'Hello ' + person.name + '!';
console.log(greet(user));`;

function encodeBase64(value) {
  if (!value) return '';
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch (error) {
    return Buffer.from(value, 'utf8').toString('base64');
  }
}

function decodeBase64(value) {
  if (!value) return '';
  try {
    const normalized = value.replace(/\s/g, '');
    if (!normalized) return '';
    return decodeURIComponent(escape(atob(normalized)));
  } catch (error) {
    return 'Invalid base64 input';
  }
}

function validateJson(value) {
  if (!value.trim()) {
    return { isValid: false, message: 'Input is empty.' };
  }

  try {
    const parsed = JSON.parse(value);
    return {
      isValid: true,
      message: 'Valid JSON syntax.',
      pretty: JSON.stringify(parsed, null, 2),
      minified: JSON.stringify(parsed),
    };
  } catch (error) {
    return {
      isValid: false,
      message: error.message,
    };
  }
}

function prettyPrintXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml.trim(), 'application/xml');
  const errorNode = doc.querySelector('parsererror');
  if (errorNode) {
    throw new Error(errorNode.textContent || 'Invalid XML syntax.');
  }

  const serializer = new XMLSerializer();
  const serialized = serializer.serializeToString(doc);

  const formatted = serialized
    .replace(/></g, '>\n<')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

  return formatted
    .replace(/\n{2,}/g, '\n')
    .replace(/\n<\//g, '\n</')
    .replace(/<\?xml[^>]*>\n?/g, '<?xml version="1.0" encoding="UTF-8"?>\n');
}

function validateXml(value) {
  if (!value.trim()) {
    return { isValid: false, message: 'Input is empty.' };
  }

  try {
    const pretty = prettyPrintXml(value);
    return {
      isValid: true,
      message: 'Valid XML syntax.',
      pretty,
    };
  } catch (error) {
    return {
      isValid: false,
      message: error.message,
    };
  }
}

function lintJavascript(code) {
  try {
    new Function(code);
    return { isValid: true, message: 'JavaScript syntax looks valid.' };
  } catch (error) {
    return { isValid: false, message: error.message };
  }
}

function lintCss(code) {
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    return { isValid: false, message: 'CSS braces are unbalanced.' };
  }

  const hasSelector = /[.#]?[A-Za-z0-9_-]+\s*\{/.test(code);
  if (!hasSelector && code.trim()) {
    return { isValid: false, message: 'CSS contains no recognizable selector block.' };
  }

  return { isValid: true, message: 'CSS structure looks valid.' };
}

function lintHtml(code) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(code, 'text/html');
    const error = doc.querySelector('parsererror');
    if (error) {
      throw new Error('HTML parser detected an error.');
    }
    return { isValid: true, message: 'HTML is parseable.' };
  } catch (error) {
    return { isValid: false, message: error.message };
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('base64');
  const [base64Input, setBase64Input] = useState('hello world');
  const [base64Mode, setBase64Mode] = useState('encode');
  const [base64Output, setBase64Output] = useState('aGVsbG8gd29ybGQ=');
  const [jsonInput, setJsonInput] = useState(initialJson);
  const [jsonStatus, setJsonStatus] = useState({ isValid: true, message: 'Ready to validate.' });
  const [xmlInput, setXmlInput] = useState(initialXml);
  const [xmlStatus, setXmlStatus] = useState({ isValid: true, message: 'Ready to validate.' });
  const [syntaxType, setSyntaxType] = useState('javascript');
  const [syntaxInput, setSyntaxInput] = useState(initialCode);
  const [syntaxStatus, setSyntaxStatus] = useState({ isValid: true, message: 'Ready to check.' });
  const [imageFiles, setImageFiles] = useState([]);
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);

  const loadFilesAsDataUrls = async (incomingFiles) => {
    const imageFilesToLoad = Array.from(incomingFiles || []).filter((file) => file.type.startsWith('image/'));

    if (!imageFilesToLoad.length) {
      return [];
    }

    return Promise.all(
      imageFilesToLoad.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: file.name, data: reader.result });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }),
      ),
    );
  };

  const handleImageFiles = async (incomingFiles) => {
    const loaded = await loadFilesAsDataUrls(incomingFiles);
    if (!loaded.length) {
      return;
    }

    setImageFiles((currentFiles) => [...currentFiles, ...loaded]);
  };

  const handleImageUpload = async (event) => {
    await handleImageFiles(event.target.files);
    event.target.value = '';
  };

  const handleImageDrop = async (event) => {
    event.preventDefault();
    setIsDragOverUpload(false);
    await handleImageFiles(event.dataTransfer.files);
  };

  const moveImage = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }

    setImageFiles((currentFiles) => {
      const nextFiles = [...currentFiles];
      const [movedFile] = nextFiles.splice(fromIndex, 1);
      nextFiles.splice(toIndex, 0, movedFile);
      return nextFiles;
    });
  };

  const removeImage = (indexToRemove) => {
    setImageFiles((currentFiles) => currentFiles.filter((_, index) => index !== indexToRemove));
  };

  const handleImageDragStart = (index) => {
    setDraggedImageIndex(index);
  };

  const handleImageDropAtIndex = (targetIndex) => {
    if (draggedImageIndex === null) {
      return;
    }

    moveImage(draggedImageIndex, targetIndex);
    setDraggedImageIndex(null);
  };

  const handleImageDragOver = (event) => {
    event.preventDefault();
  };

  const handleUploadDropAreaDragOver = (event) => {
    event.preventDefault();
    setIsDragOverUpload(true);
  };

  const handleUploadDropAreaDragLeave = (event) => {
    event.preventDefault();
    setIsDragOverUpload(false);
  };

  const handleImageDragEnd = () => {
    setDraggedImageIndex(null);
  };

  const handleUploadBoxClick = () => {
    document.getElementById('image-upload-input')?.click();
  };

  const convertImagesToPdf = async () => {
    if (!imageFiles.length) {
      alert('Please upload at least one image.');
      return;
    }

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let index = 0; index < imageFiles.length; index += 1) {
      if (index > 0) {
        pdf.addPage();
      }

      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageFiles[index].data;
      });

      const ratio = Math.min(pageWidth / image.width, pageHeight / image.height);
      const displayWidth = image.width * ratio * 0.8;
      const displayHeight = image.height * ratio * 0.8;
      const x = (pageWidth - displayWidth) / 2;
      const y = (pageHeight - displayHeight) / 2;

      pdf.addImage(imageFiles[index].data, 'PNG', x, y, displayWidth, displayHeight);
    }

    pdf.save('converted-images.pdf');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">D</div>
          <div>
            <div className="brand-title">DevToolBox</div>
            <div className="brand-subtitle">Frontend utilities</div>
          </div>
        </div>

        <nav className="nav-stack">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={`dot ${tab.accent}`} />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="content-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Developer essentials</p>
            <h1>All-in-one browser utility kit</h1>
          </div>
          <button className="ghost-button" onClick={() => setActiveTab('base64')}>
            Quick start
          </button>
        </header>

        {activeTab === 'base64' && (
          <section className="card">
            <div className="section-header">
              <h2>Base64 encoder / decoder</h2>
              <div className="pill-toggle">
                <button className={base64Mode === 'encode' ? 'selected' : ''} onClick={() => setBase64Mode('encode')}>Encode</button>
                <button className={base64Mode === 'decode' ? 'selected' : ''} onClick={() => setBase64Mode('decode')}>Decode</button>
              </div>
            </div>

            <div className="stacked-fields">
              <label>
                Input
                <textarea value={base64Input} onChange={(e) => setBase64Input(e.target.value)} rows={8} />
              </label>
              <label>
                Output
                <textarea value={base64Output} readOnly rows={8} />
              </label>
            </div>

            <div className="action-row">
              <button className="primary-button" onClick={handleBase64Action}>{base64Mode === 'encode' ? 'Encode' : 'Decode'}</button>
              <button className="secondary-button" onClick={() => copyToClipboard(base64Output)}>Copy output</button>
            </div>
          </section>
        )}

        {activeTab === 'images' && (
          <section className="card">
            <div className="section-header">
              <h2>Image to PDF converter</h2>
            </div>

            <div
              className={`upload-drop-area ${isDragOverUpload ? 'drag-over' : ''}`}
              onDragOver={handleUploadDropAreaDragOver}
              onDragLeave={handleUploadDropAreaDragLeave}
              onDrop={handleImageDrop}
              onClick={handleUploadBoxClick}
            >
              <input
                id="image-upload-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <p>Drag & drop your images here, or click to select files</p>
            </div>

            {imageFiles.length > 0 && (
              <div className="image-gallery">
                {imageFiles.map((image, index) => (
                  <div
                    key={`${image.name}-${index}`}
                    className="image-tile"
                    draggable
                    onDragStart={() => handleImageDragStart(index)}
                    onDragOver={handleImageDragOver}
                    onDrop={() => handleImageDropAtIndex(index)}
                    onDragEnd={handleImageDragEnd}
                  >
                    <div className="image-tile-order">{index + 1}</div>
                    <button className="remove-image" onClick={() => removeImage(index)}>Remove</button>
                    <img src={image.data} alt={image.name} />
                    <span>{image.name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="action-row">
              <button className="primary-button" onClick={convertImagesToPdf}>Generate PDF</button>
            </div>
          </section>
        )}

        {activeTab === 'json' && (
          <section className="card">
            <div className="section-header">
              <h2>JSON linter & formatter</h2>
              <div className="status-badge success">{jsonStatus.isValid ? 'Valid' : 'Invalid'}</div>
            </div>

            <label>
              JSON input
              <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} rows={12} />
            </label>

            <div className="action-row">
              <button className="primary-button" onClick={() => handleJsonAction('format')}>Format</button>
              <button className="secondary-button" onClick={() => handleJsonAction('minify')}>Minify</button>
              <button className="secondary-button" onClick={() => handleJsonAction('validate')}>Validate</button>
            </div>

            <div className={`result-box ${jsonStatus.isValid ? 'success' : 'error'}`}>
              <strong>{jsonStatus.message}</strong>
            </div>
          </section>
        )}

        {activeTab === 'xml' && (
          <section className="card">
            <div className="section-header">
              <h2>XML validator & formatter</h2>
              <div className="status-badge success">{xmlStatus.isValid ? 'Valid' : 'Invalid'}</div>
            </div>

            <label>
              XML input
              <textarea value={xmlInput} onChange={(e) => setXmlInput(e.target.value)} rows={12} />
            </label>

            <div className="action-row">
              <button className="primary-button" onClick={() => handleXmlAction('format')}>Format</button>
              <button className="secondary-button" onClick={() => handleXmlAction('validate')}>Validate</button>
            </div>

            <div className={`result-box ${xmlStatus.isValid ? 'success' : 'error'}`}>
              <strong>{xmlStatus.message}</strong>
            </div>
          </section>
        )}

        {activeTab === 'syntax' && (
          <section className="card">
            <div className="section-header">
              <h2>Syntax checker</h2>
              <select value={syntaxType} onChange={(event) => setSyntaxType(event.target.value)}>
                <option value="javascript">JavaScript</option>
                <option value="css">CSS</option>
                <option value="html">HTML</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <label>
              Source code
              <textarea value={syntaxInput} onChange={(e) => setSyntaxInput(e.target.value)} rows={12} />
            </label>

            <div className="action-row">
              <button className="primary-button" onClick={checkSyntax}>Check syntax</button>
            </div>

            <div className={`result-box ${syntaxStatus.isValid ? 'success' : 'error'}`}>
              <strong>{syntaxStatus.message}</strong>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
