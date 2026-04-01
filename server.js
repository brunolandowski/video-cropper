const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));
app.use(express.json());

app.post("/crop", upload.single("video"), (req, res) => {
  const { x, y, width, height } = req.body;

  const inputPath = req.file.path;
  const outputPath = `outputs/cropped-${Date.now()}.mp4`;

  const ffmpegPath =
    process.env.FFMPEG_PATH || path.join(__dirname, "ffmpeg");

  const command = `"${ffmpegPath}" -i "${inputPath}" -filter:v "crop=${width}:${height}:${x}:${y}" -c:a copy "${outputPath}"`;

  console.log("CMD:", command);

  exec(command, (err, stdout, stderr) => {
    console.log("STDERR:", stderr);

    if (err) {
      console.error(err);
      return res.status(500).send(stderr);
    }

    res.download(outputPath);

    // 🧹 cleanup après 1 min
    setTimeout(() => {
      try {
        fs.unlinkSync(outputPath);
        fs.unlinkSync(inputPath);
      } catch (e) {}
    }, 60000);
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});