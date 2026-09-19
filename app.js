import QRCode from 'qrcode';
import jsQR from 'jsqr';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const $ = (id) => document.getElementById(id);

const navButtons = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.panel');

const setActivePanel = (target) => {
  navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.target === target);
  });
  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.panel === target);
  });
};

navButtons.forEach((button) => {
  button.addEventListener('click', () => setActivePanel(button.dataset.target));
});

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  document.body.dataset.theme = theme;
  document.querySelectorAll('.mode-button[data-theme]').forEach((button) => {
    button.classList.toggle('active', button.dataset.theme === theme);
  });
  localStorage.setItem('notjustpdf-theme', theme);
};

const savedTheme = localStorage.getItem('notjustpdf-theme') || 'dark';
applyTheme(savedTheme);

document.querySelectorAll('.mode-button[data-theme]').forEach((button) => {
  button.addEventListener('click', () => applyTheme(button.dataset.theme));
});

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to read file'));
  reader.readAsDataURL(file);
});

const loadImage = (source) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Unable to load image'));
  image.src = source;
});

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const escapeHtml = (value) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const base64Input = $('base64-input');
const base64Output = $('base64-output');
const base64Action = $('base64-action');
const copyBase64 = $('copy-base64');
let base64Mode = 'encode';

const setBase64Mode = (mode) => {
  base64Mode = mode;
  document.querySelectorAll('.mode-button[data-mode]').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });

  const label = mode === 'encode' ? 'Encode' : 'Decode';
  if (base64Action) base64Action.textContent = label;

  if (!base64Input || !base64Output) return;
  if (mode === 'encode') {
    base64Output.value = base64Input.value ? btoa(unescape(encodeURIComponent(base64Input.value))) : '';
  } else {
    try {
      base64Output.value = base64Input.value ? decodeURIComponent(escape(atob(base64Input.value))) : '';
    } catch (error) {
      base64Output.value = 'Invalid Base64 input';
    }
  }
};

if (base64Action) {
  base64Action.addEventListener('click', () => {
    if (!base64Input || !base64Output) return;
    if (base64Mode === 'encode') {
      base64Output.value = base64Input.value ? btoa(unescape(encodeURIComponent(base64Input.value))) : '';
    } else {
      try {
        base64Output.value = base64Input.value ? decodeURIComponent(escape(atob(base64Input.value))) : '';
      } catch (error) {
        base64Output.value = 'Invalid Base64 input';
      }
    }
  });
}

if (copyBase64) {
  copyBase64.addEventListener('click', async () => {
    if (base64Output) await navigator.clipboard.writeText(base64Output.value);
  });
}

document.querySelectorAll('.mode-button[data-mode]').forEach((button) => {
  button.addEventListener('click', () => setBase64Mode(button.dataset.mode));
});

if (base64Input) {
  base64Input.addEventListener('input', () => {
    if (base64Mode === 'encode') {
      base64Output.value = base64Input.value ? btoa(unescape(encodeURIComponent(base64Input.value))) : '';
    }
  });
}

setBase64Mode('encode');

const pdfFileInput = $('pdf-compress-file');
const pdfTargetSizeInput = $('pdf-target-size');
const compressPdfButton = $('compress-pdf');
const pdfSizeStatus = $('pdf-size-status');

const setPdfStatus = (message, isSuccess = true) => {
  if (!pdfSizeStatus) return;
  pdfSizeStatus.classList.toggle('success', isSuccess);
  pdfSizeStatus.classList.toggle('error', !isSuccess);
  pdfSizeStatus.textContent = message;
};

const canvasToBlob = (canvas, mimeType, quality = 0.8) => new Promise((resolve) => {
  canvas.toBlob((blob) => resolve(blob), mimeType, quality);
});

const renderPdfToLowerSize = async (file, targetKb) => {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const outputDoc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const targetBytes = Math.max(1, Number(targetKb) || 200) * 1024;

  for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1.2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas not available for PDF optimization.');
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({ canvasContext: context, viewport }).promise;

    let chosenBlob = null;
    for (const quality of [0.9, 0.7, 0.5, 0.35, 0.2, 0.1]) {
      const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      if (!blob) continue;
      chosenBlob = blob;
      if (blob.size <= targetBytes * 0.9) break;
    }

    if (!chosenBlob) {
      chosenBlob = await canvasToBlob(canvas, 'image/jpeg', 0.5);
    }

    if (!chosenBlob) {
      throw new Error('Unable to create a compressed image for this PDF page.');
    }

    const imageUrl = URL.createObjectURL(chosenBlob);
    const img = await loadImage(imageUrl);
    const pageWidth = outputDoc.internal.pageSize.getWidth();
    const pageHeight = outputDoc.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
    const width = img.width * ratio;
    const height = img.height * ratio;
    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;

    if (pageIndex > 0) {
      outputDoc.addPage();
    }

    outputDoc.addImage(chosenBlob, 'JPEG', x, y, width, height, undefined, 'FAST');
    URL.revokeObjectURL(imageUrl);
  }

  return outputDoc.output('blob');
};

if (compressPdfButton && pdfFileInput) {
  compressPdfButton.addEventListener('click', async () => {
    const file = pdfFileInput.files?.[0];
    if (!file) {
      setPdfStatus('Please choose a PDF first.', false);
      return;
    }

    try {
      setPdfStatus('Optimizing PDF…');
      const targetKb = Math.max(1, Number(pdfTargetSizeInput?.value || 200));
      const optimizedBlob = await renderPdfToLowerSize(file, targetKb);
      const link = document.createElement('a');
      const url = URL.createObjectURL(optimizedBlob);
      link.href = url;
      link.download = `${file.name.replace(/\.[^.]+$/, '')}-optimized.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setPdfStatus(`Closest valid output: ${formatFileSize(optimizedBlob.size)}`);
    } catch (error) {
      setPdfStatus('Could not optimize that PDF.', false);
    }
  });
}

const imageFilesInput = $('image-files');
const imageList = $('image-list');
const imageOrderList = $('image-order-list');
const generatePdfButton = $('generate-pdf');
let selectedImages = [];
let dragIndex = null;

const isImageFile = (file) => {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name || '');
};

const reorderImages = (fromIndex, toIndex) => {
  if (fromIndex === null || fromIndex === toIndex || !selectedImages.length) return;

  const copied = [...selectedImages];
  const [moved] = copied.splice(fromIndex, 1);
  copied.splice(toIndex, 0, moved);
  selectedImages = copied;

  renderImageList();
  renderImageOrder();
};

const getImageMimeType = (file) => {
  if (file.type && file.type.startsWith('image/')) {
    return file.type;
  }

  const extension = (file.name || '').split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return 'image/jpeg';
};

const getImagePreview = async (file) => {
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);
  return {
    file,
    name: file.name,
    dataUrl,
    width: image.width,
    height: image.height,
  };
};

const renderImageList = () => {
  if (!imageList) return;

  if (!selectedImages.length) {
    imageList.innerHTML = '<div class="image-item empty">No images selected</div>';
    return;
  }

  imageList.innerHTML = selectedImages.map((item) => `
    <div class="image-item">
      <img src="${item.dataUrl}" alt="${escapeHtml(item.name)}" />
      <span>${escapeHtml(item.name)}</span>
    </div>
  `).join('');
};

const renderImageOrder = () => {
  if (!imageOrderList) return;

  if (!selectedImages.length) {
    imageOrderList.innerHTML = '<div class="image-item empty">No images selected</div>';
    return;
  }

  imageOrderList.innerHTML = selectedImages.map((item, index) => `
    <div class="image-order-item" draggable="true" data-index="${index}">
      <span class="drag-handle" aria-hidden="true">⋮⋮</span>
      <span>#${index + 1}</span>
      <span>${escapeHtml(item.name)}</span>
    </div>
  `).join('');
};

if (imageOrderList) {
  imageOrderList.addEventListener('dragstart', (event) => {
    const item = event.target.closest('.image-order-item');
    if (!item) return;

    dragIndex = Number(item.dataset.index);
    item.classList.add('dragging');

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(dragIndex));
    }
  });

  imageOrderList.addEventListener('dragover', (event) => {
    const item = event.target.closest('.image-order-item');
    if (!item) return;

    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

    imageOrderList.querySelectorAll('.image-order-item').forEach((node) => {
      node.classList.toggle('drag-over', node === item);
    });
  });

  imageOrderList.addEventListener('drop', (event) => {
    const item = event.target.closest('.image-order-item');
    if (!item || dragIndex === null) return;

    event.preventDefault();
    const targetIndex = Number(item.dataset.index);
    reorderImages(dragIndex, targetIndex);
    dragIndex = null;

    imageOrderList.querySelectorAll('.image-order-item').forEach((node) => {
      node.classList.remove('drag-over');
    });
  });

  imageOrderList.addEventListener('dragend', () => {
    dragIndex = null;
    imageOrderList.querySelectorAll('.image-order-item').forEach((node) => {
      node.classList.remove('dragging');
      node.classList.remove('drag-over');
    });
  });
}

if (imageFilesInput) {
  imageFilesInput.addEventListener('change', async () => {
    const files = Array.from(imageFilesInput.files || []).filter(isImageFile);
    selectedImages = await Promise.all(files.map(getImagePreview));
    renderImageList();
    renderImageOrder();
  });
}

if (generatePdfButton && imageFilesInput) {
  generatePdfButton.addEventListener('click', async () => {
    const images = selectedImages.length
      ? selectedImages
      : await Promise.all(Array.from(imageFilesInput.files || []).filter(isImageFile).map(getImagePreview));

    if (!images.length) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let index = 0; index < images.length; index += 1) {
      const imageEntry = images[index];
      const dataUrl = imageEntry.dataUrl;
      const img = await loadImage(dataUrl);

      if (index > 0) doc.addPage();

      const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
      const width = img.width * ratio * 0.8;
      const height = img.height * ratio * 0.8;
      const x = (pageWidth - width) / 2;
      const y = (pageHeight - height) / 2;
      const mimeType = getImageMimeType(imageEntry.file);
      const pdfFormat = mimeType === 'image/png' ? 'PNG' : 'JPEG';

      doc.addImage(dataUrl, pdfFormat, x, y, width, height, undefined, 'FAST');
    }

    doc.save('notjustpdf-images.pdf');
  });
}

const pdfImageFilesInput = $('pdf-image-files');
const pdfImageList = $('pdf-image-list');
const pdfImageOrderList = $('pdf-image-order-list');
const pdfGenerateButton = $('pdf-generate');
let currentPdfImages = [];

const reorderPdfImages = (fromIndex, toIndex) => {
  if (fromIndex === null || fromIndex === toIndex || !currentPdfImages.length) return;

  const next = [...currentPdfImages];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  currentPdfImages = next;

  renderPdfImageList(currentPdfImages);
  renderPdfImageOrder(currentPdfImages);
};

const renderPdfImageList = (images) => {
  if (!pdfImageList) return;

  pdfImageList.innerHTML = images.length
    ? images.map((item) => `
        <div class="image-item">
          <img src="${item.dataUrl}" alt="${escapeHtml(item.name)}" />
          <span>${escapeHtml(item.name)}</span>
        </div>
      `).join('')
    : '<div class="image-item empty">No images selected</div>';
};

const renderPdfImageOrder = (images) => {
  if (!pdfImageOrderList) return;

  pdfImageOrderList.innerHTML = images.length
    ? images.map((item, index) => `
        <div class="image-order-item" draggable="true" data-index="${index}">
          <span class="drag-handle" aria-hidden="true">⋮⋮</span>
          <span>#${index + 1}</span>
          <span>${escapeHtml(item.name)}</span>
        </div>
      `).join('')
    : '<div class="image-item empty">No images selected</div>';
};

const bindPdfImageOrder = () => {
  if (!pdfImageOrderList) return;

  let dragFromIndex = null;

  pdfImageOrderList.addEventListener('dragstart', (event) => {
    const item = event.target.closest('.image-order-item');
    if (!item) return;

    dragFromIndex = Number(item.dataset.index);
    item.classList.add('dragging');

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(dragFromIndex));
    }
  });

  pdfImageOrderList.addEventListener('dragover', (event) => {
    const item = event.target.closest('.image-order-item');
    if (!item) return;

    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

    pdfImageOrderList.querySelectorAll('.image-order-item').forEach((node) => {
      node.classList.toggle('drag-over', node === item);
    });
  });

  pdfImageOrderList.addEventListener('drop', (event) => {
    const item = event.target.closest('.image-order-item');
    if (!item || dragFromIndex === null) return;

    event.preventDefault();
    const targetIndex = Number(item.dataset.index);
    reorderPdfImages(dragFromIndex, targetIndex);
    dragFromIndex = null;

    pdfImageOrderList.querySelectorAll('.image-order-item').forEach((node) => {
      node.classList.remove('drag-over');
    });
  });

  pdfImageOrderList.addEventListener('dragend', () => {
    dragFromIndex = null;
    pdfImageOrderList.querySelectorAll('.image-order-item').forEach((node) => {
      node.classList.remove('dragging');
      node.classList.remove('drag-over');
    });
  });
};

bindPdfImageOrder();

if (pdfImageFilesInput) {
  pdfImageFilesInput.addEventListener('change', async () => {
    const files = Array.from(pdfImageFilesInput.files || []).filter(isImageFile);
    currentPdfImages = await Promise.all(files.map(getImagePreview));
    renderPdfImageList(currentPdfImages);
    renderPdfImageOrder(currentPdfImages);
  });
}

if (pdfGenerateButton && pdfImageFilesInput) {
  pdfGenerateButton.addEventListener('click', async () => {
    const images = currentPdfImages.length
      ? currentPdfImages
      : await Promise.all(Array.from(pdfImageFilesInput.files || []).filter(isImageFile).map(getImagePreview));

    if (!images.length) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let index = 0; index < images.length; index += 1) {
      const imageEntry = images[index];
      const img = await loadImage(imageEntry.dataUrl);

      if (index > 0) doc.addPage();

      const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
      const width = img.width * ratio * 0.8;
      const height = img.height * ratio * 0.8;
      const x = (pageWidth - width) / 2;
      const y = (pageHeight - height) / 2;
      const mimeType = getImageMimeType(imageEntry.file);
      const pdfFormat = mimeType === 'image/png' ? 'PNG' : 'JPEG';

      doc.addImage(imageEntry.dataUrl, pdfFormat, x, y, width, height, undefined, 'FAST');
    }

    doc.save('notjustpdf-images.pdf');
  });
}
