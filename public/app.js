const videoInput = document.getElementById("videoInput");
const dropZone = document.getElementById("dropZone");
const video = document.getElementById("video");
const previewVideo = document.getElementById("previewVideo");
const previewFrame = document.getElementById("previewFrame");
const cropBox = document.getElementById("cropBox");

const ratioSelect = document.getElementById("ratioSelect");

let currentFile;

let isDragging = false;
let isResizing = false;
let currentHandle = null;

let offsetX, offsetY;
let startX, startY;
let startWidth, startHeight;
let startLeft, startTop;

let lockedRatio = null;

/* load */
function loadVideo(file) {
  currentFile = file;
  const url = URL.createObjectURL(file);
  video.src = url;
  previewVideo.src = url;
}

/* 🔥 PREVIEW FIX */
function updatePreview() {
  if (!video.videoWidth) return;

  const rect = video.getBoundingClientRect();

  const scaleX = video.videoWidth / rect.width;
  const scaleY = video.videoHeight / rect.height;

  const x = cropBox.offsetLeft * scaleX;
  const y = cropBox.offsetTop * scaleY;
  const w = cropBox.offsetWidth * scaleX;
  const h = cropBox.offsetHeight * scaleY;

  const frameW = previewFrame.offsetWidth;

  // 👉 mode libre = preview suit le crop
  if (!lockedRatio) {
    previewFrame.style.height = (cropBox.offsetHeight / cropBox.offsetWidth) * frameW + "px";
  }

  const displayScale = frameW / w;

  previewVideo.style.width = video.videoWidth * displayScale + "px";
  previewVideo.style.height = video.videoHeight * displayScale + "px";

  previewVideo.style.transform = `translate(${-x * displayScale}px, ${-y * displayScale}px)`;
}

/* drag drop */
dropZone.onclick = () => videoInput.click();

videoInput.onchange = e => {
  if (e.target.files[0]) loadVideo(e.target.files[0]);
};

dropZone.ondrop = e => {
  e.preventDefault();
  loadVideo(e.dataTransfer.files[0]);
};

/* ratio */
ratioSelect.onchange = () => {
  if (!ratioSelect.value) {
    lockedRatio = null;
    updatePreview();
    return;
  }

  const [w, h] = ratioSelect.value.split("/").map(Number);
  lockedRatio = w / h;

  const frameW = previewFrame.offsetWidth;
  previewFrame.style.height = frameW / lockedRatio + "px";

  const currentWidth = cropBox.offsetWidth;
  cropBox.style.height = currentWidth / lockedRatio + "px";

  updatePreview();
};

/* handles */
["nw","ne","sw","se"].forEach(pos => {
  const h = document.createElement("div");
  h.className = "handle " + pos;
  cropBox.appendChild(h);

  h.onmousedown = e => {
    e.stopPropagation();
    isResizing = true;
    currentHandle = pos;

    startX = e.clientX;
    startY = e.clientY;
    startWidth = cropBox.offsetWidth;
    startHeight = cropBox.offsetHeight;
    startLeft = cropBox.offsetLeft;
    startTop = cropBox.offsetTop;
  };
});

/* drag */
cropBox.onmousedown = e => {
  isDragging = true;
  offsetX = e.offsetX;
  offsetY = e.offsetY;
};

document.onmousemove = e => {
  const rect = video.getBoundingClientRect();

  if (isDragging) {
    cropBox.style.left = (e.clientX - rect.left - offsetX) + "px";
    cropBox.style.top = (e.clientY - rect.top - offsetY) + "px";
    updatePreview();
  }

  if (isResizing) {
    let dx = e.clientX - startX;
    let dy = e.clientY - startY;

    let w = startWidth;
    let h = startHeight;
    let l = startLeft;
    let t = startTop;

    if (currentHandle.includes("e")) w += dx;
    if (currentHandle.includes("w")) { w -= dx; l += dx; }

    if (currentHandle.includes("s")) h += dy;
    if (currentHandle.includes("n")) { h -= dy; t += dy; }

    if (lockedRatio) h = w / lockedRatio;

    cropBox.style.width = Math.max(20, w) + "px";
    cropBox.style.height = Math.max(20, h) + "px";
    cropBox.style.left = l + "px";
    cropBox.style.top = t + "px";

    updatePreview();
  }
};

document.onmouseup = () => {
  isDragging = false;
  isResizing = false;
};