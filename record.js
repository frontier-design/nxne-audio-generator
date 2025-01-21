export default class Recorder {
  constructor(format = "webm", framerate = 30) {
    this.format = format;
    this.framerate = framerate;
    this.capturer = new CCapture({
      format: this.format,
      framerate: this.framerate,
    });
    this.isRecording = false;
  }

  start() {
    if (!this.isRecording) {
      console.log("Recording started...");
      this.capturer.start();
      this.isRecording = true;
    }
  }

  capture(canvas) {
    if (this.isRecording) {
      this.capturer.capture(canvas);
    }
  }

  stop() {
    if (this.isRecording) {
      console.log("Recording stopped. Saving...");
      this.capturer.stop();
      this.capturer.save();
      this.isRecording = false;
    }
  }
}
