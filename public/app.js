const videoInput = document.getElementById("videoInput");
const video = document.getElementById("video");
const cropBox = document.getElementById("cropBox");

const xInput = document.getElementById("x");
const yInput = document.getElementById("y");
const wInput = document.getElementById("w");
const hInput = document.getElementById("h");

const ratioSelect = document.getElementById("ratioSelect");

let isDragging = false;
let isResizing = false;
let currentHandle = null;

let offsetX, offsetY;
let startX, startY;
let startWidth, startHeight;

let lockedRatio = null;

videoInput.onchange = (e) => {
  const file = e.target.files[0];
  video.src = URL.createObjectURL(file);
};

ratioSelect.addEventListener("change", () => {
  if (!ratioSelect.value) {
    lockedRatio = null;
    return;
  }

  const [w, h] = ratioSelect.value.split("/").map(Number);
  lockedRatio = w / h;

  const currentWidth = cropBox.offsetWidth;
  cropBox.style.height = currentWidth / lockedRatio + "px";

  updateInputs();
});

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
  });
});

cropBox.addEventListener("mousedown", (e) => {
  isDragging = true;
  offsetX = e.offsetX;
  offsetY = e.offsetY;
});

document.addEventListener("mousemove", (e) => {
  const rect = video.getBoundingClientRect();

  if (isDragging) {
    let x = e.clientX - rect.left - offsetX;
    let y = e.clientY - rect.top - offsetY;

    x = Math.max(0, Math.min(x, rect.width - cropBox.offsetWidth));
    y = Math.max(0, Math.min(y, rect.height - cropBox.offsetHeight));

    cropBox.style.left = x + "px";
    cropBox.style.top = y + "px";

    updateInputs();
  }

  if (isResizing) {
    let dx = e.clientX - startX;
    let dy = e.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;

    if (currentHandle.includes("e")) newWidth += dx;
    if (currentHandle.includes("w")) newWidth -= dx;

    if (lockedRatio) {
      newHeight = newWidth / lockedRatio;
    } else {
      if (currentHandle.includes("s")) newHeight += dy;
      if (currentHandle.includes("n")) newHeight -= dy;
    }

    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);

    cropBox.style.width = newWidth + "px";
    cropBox.style.height = newHeight + "px";

    updateInputs();
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  isResizing = false;
});

function updateInputs() {
  xInput.value = parseInt(cropBox.style.left) || 0;
  yInput.value = parseInt(cropBox.style.top) || 0;
  wInput.value = cropBox.offsetWidth;
  hInput.value = cropBox.offsetHeight;
}

[xInput, yInput, wInput, hInput].forEach(input => {
  input.addEventListener("input", () => {
    cropBox.style.left = xInput.value + "px";
    cropBox.style.top = yInput.value + "px";
    cropBox.style.width = wInput.value + "px";
    cropBox.style.height = hInput.value + "px";
  });
});

async function crop() {
  const file = videoInput.files[0];

  const rect = video.getBoundingClientRect();

  const scaleX = video.videoWidth / rect.width;
  const scaleY = video.videoHeight / rect.height;

  const formData = new FormData();

  formData.append("video", file);
  formData.append("x", Math.round(xInput.value * scaleX));
  formData.append("y", Math.round(yInput.value * scaleY));
  formData.append("width", Math.round(wInput.value * scaleX));
  formData.append("height", Math.round(hInput.value * scaleY));

  const res = await fetch("/crop", {
    method: "POST",
    body: formData
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "cropped.mp4";
  a.click();
}