let img;
let song;
let fft;
let attractionPoints = [];
let motionStoppingCircles = [];
let isDragging = null;
let draggingCircle = null;
let isOpaque = true;
let previousSpectrum = [];

// Slider values
let sliceSliderValue = 10;
let dampingValue = 0.7;
let bgColorValue = "#000000";

function preload() {
  img = loadImage("assets/images/runTheJewel.png");
  song = loadSound("assets/audio/Fall Murders Summer DEMO MAS1.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  background(0);
  fft = new p5.FFT();

  // Attach event listeners to HTML elements
  document.getElementById("play-button").addEventListener("click", togglePlay);
  document
    .getElementById("toggle-opacity-button")
    .addEventListener("click", toggleOpacity);

  document.getElementById("slice-slider").addEventListener("input", (event) => {
    sliceSliderValue = int(event.target.value);
  });

  document
    .getElementById("damping-slider")
    .addEventListener("input", (event) => {
      dampingValue = float(event.target.value);
    });

  document
    .getElementById("image-input")
    .addEventListener("change", handleImageUpload);

  document
    .getElementById("audio-input")
    .addEventListener("change", handleAudioUpload);

  document
    .getElementById("bg-color-picker")
    .addEventListener("input", (event) => {
      bgColorValue = event.target.value;
    });

  document
    .getElementById("add-point-button")
    .addEventListener("click", addAttractionPoint);

  document
    .getElementById("add-circle-button")
    .addEventListener("click", addMotionStoppingCircle);

  imageMode(CENTER);

  // Add one default attraction point
  addAttractionPoint();
}

function draw() {
  background(bgColorValue);

  let spectrum = fft.analyze();
  if (previousSpectrum.length === 0) {
    previousSpectrum = spectrum.slice();
  }

  let alpha = 0.3; // Smoothing factor for spectrum
  for (let i = 0; i < spectrum.length; i++) {
    previousSpectrum[i] =
      alpha * spectrum[i] + (1 - alpha) * previousSpectrum[i];
  }
  let smoothSpectrum = previousSpectrum;

  let numSlices = sliceSliderValue;
  let baseSliceWidth = img.width / numSlices;
  let baseSliceHeight = img.height / numSlices;
  let isPlaying = song.isPlaying();

  for (let y = 0; y < numSlices; y++) {
    for (let x = 0; x < numSlices; x++) {
      let posX = x * baseSliceWidth;
      let posY = y * baseSliceHeight;
      let sliceWidth = baseSliceWidth;
      let sliceHeight = baseSliceHeight;

      let cumulativeEffectX = 0;
      let cumulativeEffectY = 0;
      let maxIntensity = 0;

      if (isPlaying) {
        for (let point of attractionPoints) {
          let tileCenterX = posX + sliceWidth / 2 + (width - img.width) / 2;
          let tileCenterY = posY + sliceHeight / 2 + (height - img.height) / 2;

          let distance = dist(point.x, point.y, tileCenterX, tileCenterY);
          let distanceFactor = map(distance, 0, width / 2, 10, 0.5);
          let freqEnergy =
            smoothSpectrum[
              floor(map(distance, 0, width, 0, smoothSpectrum.length))
            ];
          let intensity = map(freqEnergy, 0, 255, 0, point.slider.value());
          maxIntensity = max(maxIntensity, intensity);

          let dx = (point.x - tileCenterX) * 0.002 * intensity;
          let dy = (point.y - tileCenterY) * 0.002 * intensity;

          cumulativeEffectX += dx * distanceFactor;
          cumulativeEffectY += dy * distanceFactor;
        }

        // Adjust slice width and height independently based on proximity and intensity
        let widthFactor = map(maxIntensity, 0, 500, 1, 0); // More dramatic width change
        let heightFactor = map(maxIntensity, 0, 500, 1, 0); // More dramatic height change
        sliceWidth *= widthFactor;
        sliceHeight *= heightFactor;
      }

      // Motion-stopping circle effect
      let damping = dampingValue;
      for (let circle of motionStoppingCircles) {
        let distToCircle = dist(
          circle.x,
          circle.y,
          posX + sliceWidth / 2 + (width - img.width) / 2,
          posY + sliceHeight / 2 + (height - img.height) / 2
        );

        if (distToCircle < circle.slider.value()) {
          let dampingFactor = map(
            distToCircle,
            0,
            circle.slider.value(),
            0,
            damping
          );
          cumulativeEffectX *= dampingFactor;
          cumulativeEffectY *= dampingFactor;
        }
      }

      // Draw each tile with a white stroke
      push();
      stroke(255); // White stroke
      strokeWeight(0);
      fill(0);
      rect(
        posX + cumulativeEffectX + (width - img.width) / 2,
        posY + cumulativeEffectY + (height - img.height) / 2,
        sliceWidth,
        sliceHeight
      );

      // Copy image within the tile boundaries without distortion
      let clipX = x * baseSliceWidth;
      let clipY = y * baseSliceHeight;
      let clipWidth = baseSliceWidth;
      let clipHeight = baseSliceHeight;

      copy(
        img,
        clipX,
        clipY,
        clipWidth,
        clipHeight,
        posX + cumulativeEffectX + (width - img.width) / 2,
        posY + cumulativeEffectY + (height - img.height) / 2,
        baseSliceWidth,
        baseSliceHeight
      );
      pop();
    }
  }

  drawAttractionPoints();
  drawMotionStoppingCircles();
}

function handleImageUpload(event) {
  let file = event.target.files[0];
  if (file && file.type.startsWith("image")) {
    img = loadImage(URL.createObjectURL(file), () => {
      const maxDimension = 600; // Maximum width or height

      if (img.width > maxDimension || img.height > maxDimension) {
        let scaleFactor = min(
          maxDimension / img.width,
          maxDimension / img.height
        );
        img.resize(img.width * scaleFactor, img.height * scaleFactor);
      }
    });
  }
}

function handleAudioUpload(event) {
  let file = event.target.files[0];
  if (file && file.type.startsWith("audio")) {
    if (song.isPlaying()) {
      song.stop();
    }
    song = loadSound(URL.createObjectURL(file), () => {
      fft = new p5.FFT();
      document.getElementById("play-button").innerText = "Play";
    });
  }
}

function togglePlay() {
  if (song.isPlaying()) {
    song.stop();
    document.getElementById("play-button").innerText = "Play";
  } else {
    song.loop();
    document.getElementById("play-button").innerText = "Stop";
  }
}

function toggleOpacity() {
  isOpaque = !isOpaque;
}

function addAttractionPoint() {
  let newPoint = {
    x: width / 2,
    y: height / 2,
    slider: createSlider(0, 500, 250),
  };
  newPoint.slider.parent(document.getElementById("intensity-panel"));
  attractionPoints.push(newPoint);
}

function addMotionStoppingCircle() {
  let newCircle = {
    x: random(width),
    y: random(height),
    slider: createSlider(50, 300, 150),
  };
  newCircle.slider.parent(document.getElementById("intensity-panel"));
  motionStoppingCircles.push(newCircle);
}

function drawAttractionPoints() {
  for (let point of attractionPoints) {
    fill(isOpaque ? "red" : "rgba(255, 0, 0, 0)");
    noStroke();
    ellipse(point.x, point.y, 10);
  }
}

function drawMotionStoppingCircles() {
  for (let circle of motionStoppingCircles) {
    fill(isOpaque ? "rgba(0, 255, 0, 0.3)" : "rgba(0, 255, 0, 0)");
    noStroke();
    ellipse(circle.x, circle.y, circle.slider.value() * 2);
  }
}

function mousePressed() {
  for (let i = 0; i < attractionPoints.length; i++) {
    if (
      dist(mouseX, mouseY, attractionPoints[i].x, attractionPoints[i].y) < 10
    ) {
      isDragging = i;
      return;
    }
  }
  for (let i = 0; i < motionStoppingCircles.length; i++) {
    if (
      dist(
        mouseX,
        mouseY,
        motionStoppingCircles[i].x,
        motionStoppingCircles[i].y
      ) < motionStoppingCircles[i].slider.value()
    ) {
      draggingCircle = i;
      return;
    }
  }
}

function mouseDragged() {
  if (isDragging !== null) {
    attractionPoints[isDragging].x = mouseX;
    attractionPoints[isDragging].y = mouseY;
  }
  if (draggingCircle !== null) {
    motionStoppingCircles[draggingCircle].x = mouseX;
    motionStoppingCircles[draggingCircle].y = mouseY;
  }
}

function mouseReleased() {
  isDragging = null;
  draggingCircle = null;
}
