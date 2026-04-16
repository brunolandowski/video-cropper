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

/* LOAD */
function loadVideo(file) {
  currentFile = file;
  const url = URL.createObjectURL(file);
  video.src = url;
  previewVideo.src = url;
}

/* DRAG DROP */
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
  loadVideo(e.dataTransfer.files[0]);
};

/* PREVIEW FIX (IMPORTANT) */
function updatePreview() {
  if (!video.videoWidth) return;

  const rect = video.getBoundingClientRect();

  const scaleX = video.videoWidth / rect.width;
  const scaleY = video.videoHeight / rect.height;

  const x = cropBox.offsetLeft * scaleX;
  const y = cropBox.offsetTop * scaleY;
  const w = cropBox.offsetWidth * scaleX;
  const h = cropBox.offsetHeight * scaleY;

  // ratio libre
  if (!lockedRatio) {
    const frameW = previewFrame.offsetWidth;
    previewFrame.style.height = (h / w) * frameW + "px";
  }

  const scale = previewFrame.offsetWidth / w;

  previewVideo.style.width = video.videoWidth * scale + "px";
  previewVideo.style.height = video.videoHeight * scale + "px";

  previewVideo.style.left = -x * scale + "px";
  previewVideo.style.top = -y * scale + "px";
}

/* RATIO */
ratioSelect.onchange = () => {
  if (!ratioSelect.value) {
    lockedRatio = null;
    updatePreview();
    return;
  }

  const [w,h] = ratioSelect.value.split("/").map(Number);
  lockedRatio = w/h;

  const frameW = previewFrame.offsetWidth;
  previewFrame.style.height = frameW / lockedRatio + "px";

  cropBox.style.height = cropBox.offsetWidth / lockedRatio + "px";

  updatePreview();
};

/* HANDLES */
["nw","ne","sw","se"].forEach(pos=>{
  const h=document.createElement("div");
  h.className="handle "+pos;
  cropBox.appendChild(h);

  h.onmousedown=e=>{
    e.stopPropagation();
    isResizing=true;
    currentHandle=pos;

    startX=e.clientX;
    startY=e.clientY;
    startWidth=cropBox.offsetWidth;
    startHeight=cropBox.offsetHeight;
    startLeft=cropBox.offsetLeft;
    startTop=cropBox.offsetTop;
  }
});

/* DRAG */
cropBox.onmousedown=e=>{
  isDragging=true;
  offsetX=e.offsetX;
  offsetY=e.offsetY;
};

/* MOVE */
document.onmousemove=e=>{
  const rect=video.getBoundingClientRect();

  if(isDragging){
    cropBox.style.left=(e.clientX-rect.left-offsetX)+"px";
    cropBox.style.top=(e.clientY-rect.top-offsetY)+"px";
    updatePreview();
  }

  if(isResizing){
    let dx=e.clientX-startX;
    let dy=e.clientY-startY;

    let w=startWidth;
    let h=startHeight;
    let l=startLeft;
    let t=startTop;

    if(currentHandle.includes("e")) w+=dx;
    if(currentHandle.includes("w")){w-=dx;l+=dx;}
    if(currentHandle.includes("s")) h+=dy;
    if(currentHandle.includes("n")){h-=dy;t+=dy;}

    if(lockedRatio) h=w/lockedRatio;

    cropBox.style.width=Math.max(20,w)+"px";
    cropBox.style.height=Math.max(20,h)+"px";
    cropBox.style.left=l+"px";
    cropBox.style.top=t+"px";

    updatePreview();
  }
};

document.onmouseup=()=>{
  isDragging=false;
  isResizing=false;
};

/* EXPORT + PROGRESS FIX */
async function crop(){
  if(!currentFile) return;

  const rect=video.getBoundingClientRect();

  const scaleX=video.videoWidth/rect.width;
  const scaleY=video.videoHeight/rect.height;

  const formData=new FormData();
  formData.append("video",currentFile);
  formData.append("x",Math.round(cropBox.offsetLeft*scaleX));
  formData.append("y",Math.round(cropBox.offsetTop*scaleY));
  formData.append("width",Math.round(cropBox.offsetWidth*scaleX));
  formData.append("height",Math.round(cropBox.offsetHeight*scaleY));

  progressContainer.style.display="block";

  eventSource=new EventSource("/progress");
  eventSource.onmessage=e=>{
    const p=Number(e.data);
    progressBar.style.width=p+"%";
    progressText.innerText=p+"%";
  };

  const res=await fetch("/crop",{method:"POST",body:formData});
  const blob=await res.blob();

  eventSource.close();

  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="cropped.mp4";
  a.click();
}