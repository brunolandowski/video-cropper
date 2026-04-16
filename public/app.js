const videoInput = document.getElementById("videoInput");
const dropZone = document.getElementById("dropZone");
const video = document.getElementById("video");
const previewVideo = document.getElementById("previewVideo");
const previewFrame = document.getElementById("previewFrame");
const cropBox = document.getElementById("cropBox");

const ratioSelect = document.getElementById("ratioSelect");

const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

let currentFile;
let eventSource;

let isDragging = false;
let isResizing = false;
let currentHandle = null;

let offsetX, offsetY;
let startX, startY;
let startWidth, startHeight;
let startLeft, startTop;

let lockedRatio = null;

/* load video */
function loadVideo(file) {
  currentFile = file;
  const url = URL.createObjectURL(file);
  video.src = url;
  previewVideo.src = url;
}

/* preview */
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
  const frameH = previewFrame.offsetHeight;

  const scale = Math.max(frameW / w, frameH / h);

  previewVideo.style.width = video.videoWidth * scale + "px";
  previewVideo.style.height = video.videoHeight * scale + "px";

  previewVideo.style.objectFit = "none";
  previewVideo.style.objectPosition = `-${x * scale}px -${y * scale}px`;
}

/* drag & drop */
dropZone.onclick = () => videoInput.click();

videoInput.onchange = e => {
  if (e.target.files[0]) loadVideo(e.target.files[0]);
};

dropZone.ondragover = e => {
  e.preventDefault();
  dropZone.classList.add("dragover");
};

dropZone.ondragleave = () => {
  dropZone.classList.remove("dragover");
};

dropZone.ondrop = e => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) loadVideo(file);
};

/* ratio */
ratioSelect.onchange = () => {
  if (!ratioSelect.value) {
    lockedRatio = null;
    previewFrame.style.height = "150px";
    return;
  }

  const [w, h] = ratioSelect.value.split("/").map(Number);
  lockedRatio = w / h;

  const width = previewFrame.offsetWidth;
  previewFrame.style.height = width / lockedRatio + "px";

  const currentWidth = cropBox.offsetWidth;
  cropBox.style.height = currentWidth / lockedRatio + "px";

  updatePreview();
};

/* handles */
["nw","ne","sw","se"].forEach(pos => {
  const h = document.createElement("div");
  h.className = "handle " + pos;
  cropBox.appendChild(h);

  h.onmousedown = (e) => {
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
    let x = e.clientX - rect.left - offsetX;
    let y = e.clientY - rect.top - offsetY;

    cropBox.style.left = x + "px";
    cropBox.style.top = y + "px";
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

/* export */
async function crop() {
  if (!currentFile) return;

  const rect = video.getBoundingClientRect();
  const scaleX = video.videoWidth / rect.width;
  const scaleY = video.videoHeight / rect.height;

  const formData = new FormData();
  formData.append("video", currentFile);
  formData.append("x", cropBox.offsetLeft * scaleX);
  formData.append("y", cropBox.offsetTop * scaleY);
  formData.append("width", cropBox.offsetWidth * scaleX);
  formData.append("height", cropBox.offsetHeight * scaleY);

  progressContainer.style.display = "block";

  eventSource = new EventSource("/progress");
  eventSource.onmessage = e => {
    const p = Number(e.data);
    progressBar.style.width = p + "%";
    progressText.innerText = p + "%";
  };

  const res = await fetch("/crop", { method: "POST", body: formData });
  const blob = await res.blob();

  eventSource.close();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cropped.mp4";
  a.click();
}