let img;
let song;
let fft;
let playButton;
let sliceSlider;
let dampingSlider;
let addPointButton;
let addCircleButton;
let addScalePointButton;
let scaleRadiusSlider;
let radiusSlider;
let attractionPoints = [];
let scalingPoints = [];
let motionStoppingCircles = [];
let originalPositions = [];
let animatedPositions = [];
let isDragging = null;
let draggingCircle = null;
let draggingScalePoint = null;
let bgColorPicker;
let isOpaque = true;
let previousSpectrum = [];

let dampingValue = 0.7;
let lastClearTime = 0; // Store the last time the background was cleared

function preload() {
  img = loadImage("assets/images/runTheJewel.png");
  song = loadSound("assets/audio/Fall Murders Summer DEMO MAS1.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  fft = new p5.FFT();

  playButton = select("#play-button");
  playButton.mousePressed(togglePlay);

  document
    .getElementById("toggle-opacity-button")
    .addEventListener("click", toggleOpacity);

  sliceSlider = select("#slice-slider");
  radiusSlider = select("#radius-slider");
  scaleRadiusSlider = select("#scale-radius-slider");
  document
    .getElementById("damping-slider")
    .addEventListener("input", (event) => {
      dampingValue = float(event.target.value);
    });

  addPointButton = select("#add-point-button");
  addPointButton.mousePressed(addAttractionPoint);

  addCircleButton = select("#add-circle-button");
  addCircleButton.mousePressed(addMotionStoppingCircle);

  addScalePointButton = select("#add-scale-point-button");
  addScalePointButton.mousePressed(addScalingPoint);

  bgColorPicker = select("#bg-color-picker");

  imageInput = select("#image-input");
  imageInput.changed(handleImageUpload);

  audioInput = select("#audio-input");
  audioInput.changed(handleAudioUpload);

  addAttractionPoint();
  imageMode(CENTER);
}

function draw() {
  background(bgColorPicker.value());

  let spectrum = fft.analyze();
  if (previousSpectrum.length === 0) {
    previousSpectrum = spectrum.slice();
  }

  let alpha = 0.3;
  for (let i = 0; i < spectrum.length; i++) {
    previousSpectrum[i] =
      alpha * spectrum[i] + (1 - alpha) * previousSpectrum[i];
  }
  let smoothSpectrum = previousSpectrum;

  let numSlices = sliceSlider.value();
  let baseSliceWidth = img.width / numSlices;
  let baseSliceHeight = img.height / numSlices;

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

  let index = 0;
  for (let y = 0; y < numSlices; y++) {
    for (let x = 0; x < numSlices; x++) {
      let targetX = originalPositions[index].x;
      let targetY = originalPositions[index].y;

      let cumulativeEffectX = 0;
      let cumulativeEffectY = 0;
      let scaleFactor = 1;

      // Apply attraction points' influence (unchanged)
      for (let point of attractionPoints) {
        let distance = dist(point.x, point.y, targetX, targetY);

        if (distance < radiusSlider.value()) {
          let distanceFactor = map(distance, 0, radiusSlider.value(), 10, 0.1);
          let intensity = map(
            smoothSpectrum[
              floor(map(distance, 0, width, 0, smoothSpectrum.length))
            ],
            0,
            255,
            0,
            point.slider.value()
          );

          let dx = (point.x - targetX) * 0.002 * intensity;
          let dy = (point.y - targetY) * 0.002 * intensity;

          cumulativeEffectX += dx * distanceFactor;
          cumulativeEffectY += dy * distanceFactor;
        }
      }

      // Apply scaling points' influence
      for (let scalePoint of scalingPoints) {
        let distance = dist(scalePoint.x, scalePoint.y, targetX, targetY);
        let scaleRadius = scaleRadiusSlider.value();

        if (distance < scaleRadius) {
          let scalingFactor = map(
            distance,
            0,
            scaleRadius,
            scalePoint.intensitySlider.value(),
            0.5
          );
          scaleFactor *= scalingFactor;
        }
      }

      let finalSliceWidth = baseSliceWidth * scaleFactor;
      let finalSliceHeight = baseSliceHeight * scaleFactor;

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
      translate(
        animatedPositions[index].x + finalSliceWidth / 2,
        animatedPositions[index].y + finalSliceHeight / 2
      );
      imageMode(CENTER);
      copy(
        img,
        x * baseSliceWidth,
        y * baseSliceHeight,
        baseSliceWidth,
        baseSliceHeight,
        0,
        0,
        finalSliceWidth,
        finalSliceHeight
      );
      pop();

      index++;
    }
  }

  drawAttractionPoints();
  drawMotionStoppingCircles();
  drawScalingPoints();
}

function addScalingPoint() {
  let newPoint = { x: width / 3, y: height / 3 };

  let intensitySlider = createSlider(0.5, 10, 1, 0.1);

  let panel = select("#intensity-panel");
  panel.child(intensitySlider);

  newPoint.intensitySlider = intensitySlider;
  scalingPoints.push(newPoint);
}

function drawScalingPoints() {
  for (let point of scalingPoints) {
    fill(isOpaque ? "magenta" : "rgba(255, 0, 0, 0)");
    noStroke();
    ellipse(point.x, point.y, 10);
  }
}

function handleImageUpload(event) {
  let file = event.target.files[0];
  if (file && file.type.startsWith("image")) {
    img = loadImage(URL.createObjectURL(file), () => {
      const maxDimension = 600;

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
  for (let i = 0; i < scalingPoints.length; i++) {
    if (dist(mouseX, mouseY, scalingPoints[i].x, scalingPoints[i].y) < 10) {
      draggingScalePoint = i;
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
  if (draggingScalePoint !== null) {
    scalingPoints[draggingScalePoint].x = mouseX;
    scalingPoints[draggingScalePoint].y = mouseY;
  }
}

function mouseReleased() {
  isDragging = null;
  draggingCircle = null;
  draggingScalePoint = null;
}
