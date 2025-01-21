let img;
let song;
let fft;
let playButton;
let sliceSlider;
let addPointButton;
let addCircleButton;
let attractionPoints = [];
let motionStoppingCircles = [];
let originalPositions = [];
let animatedPositions = [];
let isDragging = null;
let draggingCircle = null;
let bgColorPicker;
let isOpaque = true;
let sliceWidthSlider, sliceHeightSlider;
let imageInput, audioInput;
let dampingSlider;
let previousSpectrum = [];

function preload() {
  img = loadImage("assets/images/image-three.jpg");
  song = loadSound("assets/audio/Fall Murders Summer DEMO MAS1.mp3");
}

function setup() {
  noStroke();
  createCanvas(windowWidth, windowHeight);
  background(0);
  fft = new p5.FFT();

  playButton = createButton("Play");
  playButton.position(10, 10);
  playButton.mousePressed(togglePlay);

  sliceSlider = createSlider(2, 50, 10, 1);
  createLabel("Slices", sliceSlider, 10, 40);

  addPointButton = createButton("Add Point");
  addPointButton.position(10, 70);
  addPointButton.mousePressed(addAttractionPoint);

  addCircleButton = createButton("Add Circle");
  addCircleButton.position(10, 100);
  addCircleButton.mousePressed(addMotionStoppingCircle);

  bgColorPicker = createColorPicker("#000000");
  bgColorPicker.position(10, 130);
  createLabel(".", bgColorPicker, windowWidth - 70, 25);

  let toggleOpacityButton = createButton("Toggle Opacity");
  toggleOpacityButton.position(windowWidth - 120, 70);
  toggleOpacityButton.mousePressed(toggleOpacity);

  sliceWidthSlider = createSlider(50, 300, 100, 1);
  sliceWidthSlider.position(windowWidth - 200, windowHeight - 100);
  createLabel(
    "Slice Width",
    sliceWidthSlider,
    windowWidth - 200,
    windowHeight - 120
  );

  sliceHeightSlider = createSlider(50, 300, 100, 1);
  sliceHeightSlider.position(windowWidth - 200, windowHeight - 50);
  createLabel(
    "Slice Height",
    sliceHeightSlider,
    windowWidth - 200,
    windowHeight - 70
  );

  imageInput = createFileInput(handleImageUpload);
  imageInput.position(10, windowHeight - 70);
  imageInput.style("margin-top", "15px");
  createLabel("Upload Image", imageInput, 10, windowHeight - 90);

  audioInput = createFileInput(handleAudioUpload);
  audioInput.position(150, windowHeight - 100);
  audioInput.style("margin-top", "15px");
  createLabel("Upload Audio", audioInput, 150, windowHeight - 90);

  dampingSlider = createSlider(0, 1, 0.7, 0.01);
  dampingSlider.position(10, windowHeight - 140);
  createLabel("Damping Factor", dampingSlider, 10, windowHeight - 160);

  addAttractionPoint();
  imageMode(CENTER);
}

function draw() {
  background(bgColorPicker.value());

  // Smooth the spectrum
  let spectrum = fft.analyze();
  if (previousSpectrum.length === 0) {
    previousSpectrum = spectrum.slice();
  }

  let alpha = 0.3; // Smoothing factor (0 = very smooth, 1 = no smoothing)
  for (let i = 0; i < spectrum.length; i++) {
    previousSpectrum[i] =
      alpha * spectrum[i] + (1 - alpha) * previousSpectrum[i];
  }
  let smoothSpectrum = previousSpectrum;

  // Slices setup
  let numSlices = sliceSlider.value();
  let baseSliceWidth = img.width / numSlices;
  let baseSliceHeight = img.height / numSlices;

  let sliceWidth = baseSliceWidth * (sliceWidthSlider.value() / 100);
  let sliceHeight = baseSliceHeight * (sliceHeightSlider.value() / 100);

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

      // Attraction Points without Rotation
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

        // Linear motion effect only (no rotation)
        let dx = (point.x - (targetX + sliceWidth / 2)) * 0.001 * intensity;
        let dy = (point.y - (targetY + sliceHeight / 2)) * 0.001 * intensity;

        cumulativeEffectX += dx * distanceFactor;
        cumulativeEffectY += dy * distanceFactor;
      }

      // Damping from Motion-Stopping Circles
      let dampingValue = dampingSlider.value();
      for (let circle of motionStoppingCircles) {
        let distToCircle = dist(
          circle.x,
          circle.y,
          animatedPositions[index].x + sliceWidth / 2,
          animatedPositions[index].y + sliceHeight / 2
        );

        if (distToCircle < circle.slider.value()) {
          let damping = map(
            distToCircle,
            0,
            circle.slider.value(),
            0,
            dampingValue
          );
          cumulativeEffectX *= damping;
          cumulativeEffectY *= damping;
        }
      }

      // Smoothly animate slices toward target positions
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

      blendMode(DIFFERENCE);

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
      // Draw the image slice

      index++;
    }
  }

  // Draw attraction points and circles
  drawAttractionPoints();
  drawMotionStoppingCircles();
}

function handleImageUpload(file) {
  if (file.type === "image") {
    img = loadImage(file.data, () => {
      if (img.width > 600 || img.height > 600) {
        if (img.width > img.height) {
          img.resize(600, 0);
        } else {
          img.resize(0, 600);
        }
      }

      originalPositions = [];
      animatedPositions = [];
    });
  }
}

function handleAudioUpload(file) {
  if (file.type === "audio") {
    if (song.isPlaying()) {
      song.stop();
    }
    song = loadSound(file.data, () => {
      fft = new p5.FFT();
      playButton.html("Play");
    });
  }
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

function togglePlay() {
  if (song.isPlaying()) {
    song.stop();
    playButton.html("Play");
  } else {
    song.loop();
    playButton.html("Stop");
  }
}

function toggleOpacity() {
  isOpaque = !isOpaque;
}

function addAttractionPoint() {
  let newPoint = {
    x: random(width),
    y: random(height),
    slider: createSlider(0, 500, 250),
  };
  createLabel(
    `Point ${attractionPoints.length + 1} Intensity`,
    newPoint.slider,
    10,
    150 + attractionPoints.length * 50
  );
  attractionPoints.push(newPoint);
}

function addMotionStoppingCircle() {
  let newCircle = {
    x: random(width),
    y: random(height),
    slider: createSlider(50, 300, 150),
  };
  createLabel(
    `Circle ${motionStoppingCircles.length + 1} Radius`,
    newCircle.slider,
    150,
    150 + motionStoppingCircles.length * 50
  );
  motionStoppingCircles.push(newCircle);
}

function createLabel(labelText, slider, x, y) {
  let label = createDiv(labelText);
  label.style("color", "white");
  label.position(x, y - 10);
  slider.position(x, y);
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
