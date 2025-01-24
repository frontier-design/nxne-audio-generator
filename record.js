const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const preview = document.getElementById("preview");
const downloadLink = document.getElementById("downloadLink");

let mediaRecorder;
let recordedChunks = [];

startBtn.addEventListener("click", async () => {
  try {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      throw new Error(
        "Canvas element not found. Please ensure the sketch is running."
      );
    }
    const canvasStream = canvas.captureStream(60);

    const audioContext = getAudioContext();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    const audioDestination = audioContext.createMediaStreamDestination();
    song.connect(audioDestination);
    const audioStream = audioDestination.stream;

    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);

    const options = {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 5000000,
    };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = "video/webm";
    }
    mediaRecorder = new MediaRecorder(combinedStream, options);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      downloadLink.href = url;
      downloadLink.style.display = "block";
      downloadLink.download = "canvas-recording.webm";
      downloadLink.innerText = "Download Recording";

      recordedChunks = [];
    };

    mediaRecorder.start();
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } catch (err) {
    console.error("Error starting recording:", err);
    alert(`Error: ${err.message}`);
  }
});

// Stop Recording
stopBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  startBtn.disabled = false;
  stopBtn.disabled = true;
});
