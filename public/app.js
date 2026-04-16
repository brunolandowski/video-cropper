const videoInput = document.getElementById("videoInput");
const dropZone = document.getElementById("dropZone");
const video = document.getElementById("video");
const previewVideo = document.getElementById("previewVideo");
const cropBox = document.getElementById("cropBox");

let currentFile;

/* load video */
function loadVideo(file) {
  currentFile = file;
  const url = URL.createObjectURL(file);
  video.src = url;
  previewVideo.src = url;
}

/* preview update */
function updatePreview() {
  const videoRect = video.getBoundingClientRect();

  const scaleX = video.videoWidth / videoRect.width;
  const scaleY = video.videoHeight / videoRect.height;

  const x = cropBox.offsetLeft * scaleX;
  const y = cropBox.offsetTop * scaleY;
  const w = cropBox.offsetWidth * scaleX;
  const h = cropBox.offsetHeight * scaleY;

  previewVideo.style.objectPosition = `-${x}px -${y}px`;
  previewVideo.style.objectFit = "none";
  previewVideo.width = w;
  previewVideo.height = h;
}

/* drag drop */
dropZone.onclick = () => videoInput.click();

videoInput.onchange = e => loadVideo(e.target.files[0]);

dropZone.ondrop = e => {
  e.preventDefault();
  loadVideo(e.dataTransfer.files[0]);
};

/* resize + drag (simplifié) */
document.onmousemove = () => updatePreview();

/* export inchangé (garde ton code actuel) */