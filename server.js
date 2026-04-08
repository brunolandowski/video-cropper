const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));
app.use(express.json());

let currentProgress = 0;

// 📡 SSE progress
app.get("/progress", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const interval = setInterval(() => {
    res.write(`data: ${currentProgress}\n\n`);
  }, 300);

  req.on("close", () => clearInterval(interval));
});

// 🎬 Crop route
app.post("/crop", upload.single("video"), (req, res) => {
  const { x, y, width, height } = req.body;

  const inputPath = req.file.path;
  const outputPath = `outputs/cropped-${Date.now()}.mp4`;

  const ffmpegPath =
    process.env.FFMPEG_PATH || path.join(__dirname, "ffmpeg");

  currentProgress = 0;

  const ffmpeg = spawn(ffmpegPath, [
    "-i", inputPath,
    "-filter:v", `crop=${width}:${height}:${x}:${y}`,
    "-c:a", "copy",
    outputPath
  ]);

  let duration = 0;

  ffmpeg.stderr.on("data", (data) => {
    const str = data.toString();

    // durée totale
    const durMatch = str.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (durMatch) {
      const [, h, m, s] = durMatch;
      duration = (+h * 3600) + (+m * 60) + (+s);
    }

    // progression actuelle
    const timeMatch = str.match(/time=(\d+):(\d+):(\d+\.\d+)/);
    if (timeMatch && duration) {
      const [, h, m, s] = timeMatch;
      const currentTime = (+h * 3600) + (+m * 60) + (+s);

      currentProgress = Math.min(
        Math.round((currentTime / duration) * 100),
        100
      );
    }
  });

  ffmpeg.on("close", () => {
    currentProgress = 100;

    res.download(outputPath, () => {
      setTimeout(() => {
        try {
          fs.unlinkSync(outputPath);
          fs.unlinkSync(inputPath);
        } catch (e) {}
      }, 60000);
    });
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});