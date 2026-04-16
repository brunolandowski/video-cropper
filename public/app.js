const videoInput = document.getElementById("videoInput");
const dropZone = document.getElementById("dropZone");
const video = document.getElementById("video");
const previewVideo = document.getElementById("previewVideo");
const cropBox = document.getElementById("cropBox");

const xInput = document.getElementById("x");
const yInput = document.getElementById("y");
const wInput = document.getElementById("w");
const hInput = document.getElementById("h");

const ratioSelect = document.getElementById("ratioSelect");

const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

let currentFile;
let eventSource;

// drag / resize states
let isDragging = false;
let isResizing = false;
let currentHandle = null;

let offsetX, offsetY;
let startX, startY;
let startWidth, startHeight;
let startLeft, startTop;

let lockedRatio = null;

//
// 📥 LOAD VIDEO
//
function loadVideo(file) {
  currentFile = file;
  const url = URL.createObjectURL(file);

  video.src = url;
  previewVideo.src = url;
}

//
// 🎯 PREVIEW LIVE
//
function updatePreview() {
  if (!video.videoWidth) return;

  const rect = video.getBoundingClientRect();

  const scaleX = video.videoWidth / rect.width;
  const scaleY = video.videoHeight / rect.height;

  const x = cropBox.offsetLeft * scaleX;
  const y = cropBox.offsetTop * scaleY;
  const w = cropBox.offsetWidth * scaleX;
  const h = cropBox.offsetHeight * scaleY;

  previewVideo.style.objectFit = "none";
  previewVideo.style.objectPosition = `-${x}px -${y}px`;
  previewVideo.width = w;
  previewVideo.height = h;
}

//
// 📥 DRAG & DROP
//
dropZone.addEventListener("click", () => videoInput.click());

videoInput.addEventListener("change", (e) => {
  if (e.target.files[0]) loadVideo(e.target.files[0]);
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const file = e.dataTransfer.files[0];
  if (file) loadVideo(file);
});

//
// 🎯 RATIO
//
ratioSelect.addEventListener("change", () => {
  if (!ratioSelect.value) {
    lockedRatio = null;
    return;
  }

  const [w, h] = ratioSelect.value.split("/").map(Number);
  lockedRatio = w / h;

  const currentWidth = cropBox.offsetWidth;
  cropBox.style.height = currentWidth / lockedRatio + "px";

  updatePreview();
});

//
// 🔴 HANDLES
//
["nw","ne","sw","se"].forEach(pos => {
  const handle = document.createElement("div");
  handle.className = "handle " + pos;
  cropBox.appendChild(handle);

  handle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    isResizing = true;
    currentHandle = pos;

    startX = e.clientX;
    startY = e.clientY;
    startWidth = cropBox.offsetWidth;
    startHeight = cropBox.offsetHeight;
    startLeft = cropBox.offsetLeft;
    startTop = cropBox.offsetTop;
  });
});

//
// 🟦 DRAG
//
cropBox.addEventListener("mousedown", (e) => {
  isDragging = true;
  offsetX = e.offsetX;
  offsetY = e.offsetY;
});

//
// 🖱 MOVE
//
document.addEventListener("mousemove", (e) => {
  const rect = video.getBoundingClientRect();

  // DRAG
  if (isDragging) {
    let x = e.clientX - rect.left - offsetX;
    let y = e.clientY - rect.top - offsetY;

    x = Math.max(0, Math.min(x, rect.width - cropBox.offsetWidth));
    y = Math.max(0, Math.min(y, rect.height - cropBox.offsetHeight));

    cropBox.style.left = x + "px";
    cropBox.style.top = y + "px";

    updateInputs();
    updatePreview();
  }

  // RESIZE
  if (isResizing) {
    let dx = e.clientX - startX;
    let dy = e.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    if (currentHandle.includes("e")) newWidth += dx;
    if (currentHandle.includes("w")) {
      newWidth -= dx;
      newLeft += dx;
    }

    if (currentHandle.includes("s")) newHeight += dy;
    if (currentHandle.includes("n")) {
      newHeight -= dy;
      newTop += dy;
    }

    if (lockedRatio) {
      newHeight = newWidth / lockedRatio;
    }

    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);

    cropBox.style.width = newWidth + "px";
    cropBox.style.height = newHeight + "px";
    cropBox.style.left = newLeft + "px";
    cropBox.style.top = newTop + "px";

    updateInputs();
    updatePreview();
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  isResizing = false;
});

//
// 🔢 INPUT SYNC
//
function updateInputs() {
  xInput.value = cropBox.offsetLeft;
  yInput.value = cropBox.offsetTop;
  wInput.value = cropBox.offsetWidth;
  hInput.value = cropBox.offsetHeight;
}

//
// 🎬 EXPORT
//
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

  eventSource.onmessage = (e) => {
    const percent = Number(e.data);
    progressBar.style.width = percent + "%";
    progressText.innerText = percent + "%";
  };

  const res = await fetch("/crop", {
    method: "POST",
    body: formData
  });

  const blob = await res.blob();

  eventSource.close();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cropped.mp4";
  a.click();
}