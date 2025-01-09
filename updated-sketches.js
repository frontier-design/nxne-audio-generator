let img;
let song;
let fft;
let attractionPoints = [];
let motionStoppingCircles = [];
let originalPositions = [];
let animatedPositions = [];
let isDragging = null;
let draggingCircle = null;
let isOpaque = true;
let previousSpectrum = [];

// Slider values
let sliceSliderValue = 10;
let sliceWidthSliderValue = 100;
let sliceHeightSliderValue = 100;
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
    .getElementById("slice-width-slider")
    .addEventListener("input", (event) => {
      sliceWidthSliderValue = int(event.target.value);
    });

  document
    .getElementById("slice-height-slider")
    .addEventListener("input", (event) => {
      sliceHeightSliderValue = int(event.target.value);
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

  // Smooth the spectrum
  let spectrum = fft.analyze();
  if (previousSpectrum.length === 0) {
    previousSpectrum = spectrum.slice();
  }

  let alpha = 0.3; // Smoothing factor
  for (let i = 0; i < spectrum.length; i++) {
    previousSpectrum[i] =
      alpha * spectrum[i] + (1 - alpha) * previousSpectrum[i];
  }
  let smoothSpectrum = previousSpectrum;

  // Slices setup
  let numSlices = sliceSliderValue;
  let baseSliceWidth = img.width / numSlices;
  let baseSliceHeight = img.height / numSlices;
  let sliceWidth = baseSliceWidth * (sliceWidthSliderValue / 100);
  let sliceHeight = baseSliceHeight * (sliceHeightSliderValue / 100);

  // Reset positions when slice count changes
  if (originalPositions.length !== numSlices * numSlices) {
    originalPositions = [];
    animatedPositions = [];
    let imgX = (width - img.width) / 2;
    let imgY = (height - img.height) / 2;

    for (let y = 0; y < numSlices; y++) {
      for (let x = 0; x < numSlices; x++) {
        let posX = imgX + x * baseSliceWidth;
        let posY = imgY + y * baseSliceHeight;
        originalPositions.push({ x: posX, y: posY });
        animatedPositions.push({ x: posX, y: posY });
      }
    }
  }

  // Update and render slices
  let index = 0;
  for (let y = 0; y < numSlices; y++) {
    for (let x = 0; x < numSlices; x++) {
      let targetX = originalPositions[index].x;
      let targetY = originalPositions[index].y;
      let cumulativeEffectX = 0;
      let cumulativeEffectY = 0;

      // Attraction point effect
      for (let point of attractionPoints) {
        let distance = dist(
          point.x,
          point.y,
          targetX + sliceWidth / 2,
          targetY + sliceHeight / 2
        );
        let distanceFactor = map(distance, 0, width / 2, 2, 0.01);
        let freqEnergy =
          smoothSpectrum[
            floor(map(distance, 0, width, 0, smoothSpectrum.length))
          ];
        let intensity = map(freqEnergy, 0, 255, 0, point.slider.value());

        let dx = (point.x - (targetX + sliceWidth / 2)) * 0.001 * intensity;
        let dy = (point.y - (targetY + sliceHeight / 2)) * 0.001 * intensity;

        cumulativeEffectX += dx * distanceFactor;
        cumulativeEffectY += dy * distanceFactor;
      }

      // Motion-stopping circle effect
      let damping = dampingValue;
      for (let circle of motionStoppingCircles) {
        let distToCircle = dist(
          circle.x,
          circle.y,
          animatedPositions[index].x + sliceWidth / 2,
          animatedPositions[index].y + sliceHeight / 2
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

      animatedPositions[index].x = lerp(
        animatedPositions[index].x,
        targetX + cumulativeEffectX,
        0.2
      );
      animatedPositions[index].y = lerp(
        animatedPositions[index].y,
        targetY + cumulativeEffectY,
        0.2
      );

      push();
      copy(
        img,
        x * baseSliceWidth,
        y * baseSliceHeight,
        baseSliceWidth,
        baseSliceHeight,
        animatedPositions[index].x,
        animatedPositions[index].y,
        sliceWidth,
        sliceHeight
      );
      pop();

      index++;
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

      // Check if the image exceeds the max dimension
      if (img.width > maxDimension || img.height > maxDimension) {
        // Calculate the scaling factor to fit within max dimensions
        let scaleFactor = min(
          maxDimension / img.width,
          maxDimension / img.height
        );

        // Resize the image while maintaining aspect ratio
        img.resize(img.width * scaleFactor, img.height * scaleFactor);
      }

      originalPositions = [];
      animatedPositions = [];
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
