const videoInput = document.getElementById("videoInput");
const video = document.getElementById("video");
const cropBox = document.getElementById("cropBox");

const xInput = document.getElementById("x");
const yInput = document.getElementById("y");
const wInput = document.getElementById("w");
const hInput = document.getElementById("h");

const ratioSelect = document.getElementById("ratioSelect");

const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

let eventSource;

let isDragging = false;
let isResizing = false;
let currentHandle = null;

let offsetX, offsetY;
let startX, startY;
let startWidth, startHeight;
let startLeft, startTop;

let lockedRatio = null;

// 🎥 load video
videoInput.onchange = (e) => {
  video.src = URL.createObjectURL(e.target.files[0]);
};

// 🎯 ratio
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

// 🟥 handles
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

// 🟦 drag
cropBox.addEventListener("mousedown", (e) => {
  isDragging = true;
  offsetX = e.offsetX;
  offsetY = e.offsetY;
});

// 🖱 move
document.addEventListener("mousemove", (e) => {
  const rect = video.getBoundingClientRect();

  // drag
  if (isDragging) {
    let x = e.clientX - rect.left - offsetX;
    let y = e.clientY - rect.top - offsetY;

    x = Math.max(0, Math.min(x, rect.width - cropBox.offsetWidth));
    y = Math.max(0, Math.min(y, rect.height - cropBox.offsetHeight));

    cropBox.style.left = x + "px";
    cropBox.style.top = y + "px";

    updateInputs();
  }

  // resize
  if (isResizing) {
    let dx = e.clientX - startX;
    let dy = e.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    // 👉 droite
    if (currentHandle.includes("e")) {
      newWidth = startWidth + dx;
    }

    // 👉 gauche
    if (currentHandle.includes("w")) {
      newWidth = startWidth - dx;
      newLeft = startLeft + dx;
    }

    // 👉 bas
    if (currentHandle.includes("s")) {
      newHeight = startHeight + dy;
    }

    // 👉 haut
    if (currentHandle.includes("n")) {
      newHeight = startHeight - dy;
      newTop = startTop + dy;
    }

    // 🎯 ratio lock
    if (lockedRatio) {
      if (currentHandle.includes("w") || currentHandle.includes("e")) {
        newHeight = newWidth / lockedRatio;
      } else {
        newWidth = newHeight * lockedRatio;
      }
    }

    // min size
    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);

    cropBox.style.width = newWidth + "px";
    cropBox.style.height = newHeight + "px";
    cropBox.style.left = newLeft + "px";
    cropBox.style.top = newTop + "px";

    updateInputs();
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  isResizing = false;
});

// 🔢 sync inputs
function updateInputs() {
  xInput.value = parseInt(cropBox.style.left) || 0;
  yInput.value = parseInt(cropBox.style.top) || 0;
  wInput.value = cropBox.offsetWidth;
  hInput.value = cropBox.offsetHeight;
}

// 🎬 export + progress temps réel
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

  progressContainer.style.display = "block";

  eventSource = new EventSource("/progress");

  eventSource.onmessage = (event) => {
    const percent = Number(event.data);
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

  setTimeout(() => {
    progressContainer.style.display = "none";
  }, 2000);
}