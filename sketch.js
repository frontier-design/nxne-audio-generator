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
let bgColorPicker;
let pathLengthSlider;

let attractionPoints = [];
let scalingPoints = [];
let motionStoppingCircles = [];
let originalPositions = [];
let animatedPositions = [];
let previousSpectrum = [];
let interactions = [];
let pathHistories = [];

let isDragging = null;
let draggingCircle = null;
let draggingScalePoint = null;
let selectedItem = null;
let isOpaque = true;

let dampingValue = 0.7;
let lastClearTime = 0;
let attractionIndex = 1;
let circleIndex = 1;
let scalingIndex = 1;

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

  document.getElementById("clear-button").addEventListener("click", clearAll);
  document
    .getElementById("delete-button")
    .addEventListener("click", (event) => {
      event.stopPropagation();
      deleteSelected();
    });

  sliceSlider = select("#slice-slider");
  radiusSlider = select("#radius-slider");
  scaleRadiusSlider = select("#scale-radius-slider");
  dampingSlider = select("#damping-slider");
  dampingSlider.input(() => {
    dampingValue = float(dampingSlider.value());
  });

  pathLengthSlider = select("#path-length-slider");

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

  let maxDimension = 700;
  let scaleFactor = Math.min(
    1,
    maxDimension / img.width,
    maxDimension / img.height
  );

  let displayWidth = img.width * scaleFactor;
  let displayHeight = img.height * scaleFactor;

  let baseSliceWidth = Math.round(displayWidth / numSlices);
  let baseSliceHeight = Math.round(displayHeight / numSlices);

  displayWidth = baseSliceWidth * numSlices;
  displayHeight = baseSliceHeight * numSlices;

  let imgTopLeftX = (width - displayWidth) / 2;
  let imgTopLeftY = (height - displayHeight) / 2;

  // stroke(255, 0, 0);
  noFill();
  rect(imgTopLeftX, imgTopLeftY, displayWidth, displayHeight);

  // stroke(0, 255, 0, 100);
  for (let i = 0; i <= numSlices; i++) {
    let x = imgTopLeftX + i * baseSliceWidth;
    let y = imgTopLeftY + i * baseSliceHeight;
    line(x, imgTopLeftY, x, imgTopLeftY + displayHeight);
    line(imgTopLeftX, y, imgTopLeftX + displayWidth, y);
  }

  if (originalPositions.length !== numSlices * numSlices) {
    originalPositions = [];
    animatedPositions = [];
    pathHistories = [];

    for (let y = 0; y < numSlices; y++) {
      for (let x = 0; x < numSlices; x++) {
        let posX = imgTopLeftX + x * baseSliceWidth;
        let posY = imgTopLeftY + y * baseSliceHeight;
        originalPositions.push({ x: posX, y: posY });
        animatedPositions.push({ x: posX, y: posY });
        pathHistories.push([]);
      }
    }
  }

  let pathLength = pathLengthSlider.value();
  let index = 0;

  for (let y = 0; y < numSlices; y++) {
    for (let x = 0; x < numSlices; x++) {
      let targetX = originalPositions[index].x;
      let targetY = originalPositions[index].y;

      let cumulativeEffectX = 0;
      let cumulativeEffectY = 0;
      let sliceScaleFactor = 1;

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

      for (let circle of motionStoppingCircles) {
        let distToCircle = dist(
          circle.x,
          circle.y,
          targetX + baseSliceWidth / 2,
          targetY + baseSliceHeight / 2
        );

        if (distToCircle < circle.slider.value()) {
          let dampingFactor = map(
            distToCircle,
            0,
            circle.slider.value(),
            0,
            dampingValue
          );
          cumulativeEffectX *= dampingFactor;
          cumulativeEffectY *= dampingFactor;
        }
      }

      for (let scalePoint of scalingPoints) {
        let distance = dist(scalePoint.x, scalePoint.y, targetX, targetY);
        let scaleRadius = scaleRadiusSlider.value();

        if (distance < scaleRadius) {
          let freqIndex = floor(
            map(distance, 0, width, 0, smoothSpectrum.length)
          );
          freqIndex = constrain(freqIndex, 0, smoothSpectrum.length - 1);

          let audioIntensity = map(
            smoothSpectrum[freqIndex],
            0,
            255,
            1,
            scalePoint.intensitySlider.value()
          );

          let scalingFactor = map(
            distance,
            0,
            scaleRadius,
            audioIntensity,
            0.2
          );

          sliceScaleFactor *= scalingFactor;
        }
      }

      let finalSliceWidth = baseSliceWidth * sliceScaleFactor;
      let finalSliceHeight = baseSliceHeight * sliceScaleFactor;

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

      // Store the path history
      if (pathLength > 0) {
        pathHistories[index].push({
          x: animatedPositions[index].x,
          y: animatedPositions[index].y,
          scale: sliceScaleFactor,
        });

        // Limit the history length to the specified pathLength
        while (pathHistories[index].length > pathLength) {
          pathHistories[index].shift();
        }

        // Draw the path
        for (let i = 0; i < pathHistories[index].length; i++) {
          let pos = pathHistories[index][i];
          push();
          translate(pos.x + baseSliceWidth / 2, pos.y + baseSliceHeight / 2);
          scale(pos.scale);
          imageMode(CENTER);

          let originalSliceWidth = Math.round(img.width / numSlices);
          let originalSliceHeight = Math.round(img.height / numSlices);

          copy(
            img,
            x * originalSliceWidth,
            y * originalSliceHeight,
            originalSliceWidth,
            originalSliceHeight,
            -baseSliceWidth / 2,
            -baseSliceHeight / 2,
            baseSliceWidth,
            baseSliceHeight
          );

          pop();
        }
      }

      // Draw the current slice
      push();
      translate(
        animatedPositions[index].x + baseSliceWidth / 2,
        animatedPositions[index].y + baseSliceHeight / 2
      );
      scale(sliceScaleFactor);
      imageMode(CENTER);

      let originalSliceWidth = Math.round(img.width / numSlices);
      let originalSliceHeight = Math.round(img.height / numSlices);

      copy(
        img,
        x * originalSliceWidth,
        y * originalSliceHeight,
        originalSliceWidth,
        originalSliceHeight,
        -baseSliceWidth / 2,
        -baseSliceHeight / 2,
        baseSliceWidth,
        baseSliceHeight
      );

      pop();

      index++;
    }
  }

  drawAttractionPoints();
  drawMotionStoppingCircles();
  drawScalingPoints();
}

function handleImageUpload(event) {
  let file = event.target.files[0];
  if (file && file.type.startsWith("image")) {
    img = loadImage(URL.createObjectURL(file), () => {
      // Force recalculation of the slicing logic
      let numSlices = sliceSlider.value();

      let maxDimension = 700;
      let scaleFactor = Math.min(
        1,
        maxDimension / img.width,
        maxDimension / img.height
      );

      let displayWidth = img.width * scaleFactor;
      let displayHeight = img.height * scaleFactor;

      let baseSliceWidth = Math.round(displayWidth / numSlices);
      let baseSliceHeight = Math.round(displayHeight / numSlices);

      displayWidth = baseSliceWidth * numSlices;
      displayHeight = baseSliceHeight * numSlices;

      let imgTopLeftX = (width - displayWidth) / 2;
      let imgTopLeftY = (height - displayHeight) / 2;

      originalPositions = [];
      animatedPositions = [];
      pathHistories = [];

      for (let y = 0; y < numSlices; y++) {
        for (let x = 0; x < numSlices; x++) {
          let posX = imgTopLeftX + x * baseSliceWidth;
          let posY = imgTopLeftY + y * baseSliceHeight;
          originalPositions.push({ x: posX, y: posY });
          animatedPositions.push({ x: posX, y: posY });
          pathHistories.push([]);
        }
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
  console.log(`Opacity toggled: ${isOpaque ? "Opaque" : "Transparent"}`);
}

function addAttractionPoint() {
  let newPoint = {
    x: width / 2,
    y: height / 2,
    slider: createSlider(0, 500, 250),
    label: attractionIndex,
  };

  // Create a container for the slider and its label
  let sliderContainer = createDiv();
  sliderContainer.style("display", "flex");
  sliderContainer.style("align-items", "center");

  // Create the label next to the slider
  let sliderLabel = createDiv(`A${attractionIndex}`);
  sliderLabel.style("color", "red");
  sliderLabel.style("margin-left", "8px");
  sliderLabel.style("margin-top", "-15px");
  sliderLabel.style("margin-top", "-15px");
  sliderLabel.style("background-color", "rgba(255, 0, 0, 0.3)");
  sliderLabel.style("padding", "1px 3px");

  newPoint.slider.parent(sliderContainer);
  sliderLabel.parent(sliderContainer);
  sliderContainer.parent(document.getElementById("intensity-panel"));

  attractionPoints.push(newPoint);
  attractionIndex++;
}

function addMotionStoppingCircle() {
  let newCircle = {
    x: random(width),
    y: random(height),
    slider: createSlider(50, 300, 150),
    label: circleIndex,
  };

  // Create a container for the slider and its label
  let sliderContainer = createDiv();
  sliderContainer.style("display", "flex");
  sliderContainer.style("align-items", "center");

  // Create the label next to the slider
  let sliderLabel = createDiv(`C${circleIndex}`);
  sliderLabel.style("color", "rgb(0,255,0)");
  sliderLabel.style("margin-left", "8px");
  sliderLabel.style("margin-top", "-15px");
  sliderLabel.style("background-color", "rgba(0, 255, 0, 0.3)");
  sliderLabel.style("padding", "1px 3px");

  newCircle.slider.parent(sliderContainer);
  sliderLabel.parent(sliderContainer);
  sliderContainer.parent(document.getElementById("intensity-panel"));

  motionStoppingCircles.push(newCircle);
  circleIndex++;
}

function addScalingPoint() {
  let newPoint = {
    x: width / 3,
    y: height / 3,
    intensitySlider: createSlider(0.5, 10, 1, 0.1),
    label: scalingIndex,
  };

  // Create a container for the slider and its label
  let sliderContainer = createDiv();
  sliderContainer.style("display", "flex");
  sliderContainer.style("align-items", "center");

  // Create the label next to the slider
  let sliderLabel = createDiv(`S${scalingIndex}`);
  sliderLabel.style("color", "magenta");
  sliderLabel.style("margin-left", "8px");
  sliderLabel.style("margin-top", "-15px");
  sliderLabel.style("background-color", "rgba(255, 0, 255, 0.3)");
  sliderLabel.style("padding", "1px 3px");

  newPoint.intensitySlider.parent(sliderContainer);
  sliderLabel.parent(sliderContainer);
  sliderContainer.parent(document.getElementById("intensity-panel"));

  scalingPoints.push(newPoint);
  scalingIndex++;
}

function drawAttractionPoints() {
  for (let point of attractionPoints) {
    if (isOpaque) {
      fill("red");
    } else {
      noFill();
    }
    noStroke();
    ellipse(point.x, point.y, 10);

    // Render labels only if isOpaque is true
    if (isOpaque) {
      textSize(12);
      textAlign(CENTER, CENTER);
      fill("white");
      text(`A${point.label}`, point.x - 15, point.y - 15);
    }
  }
}

function drawMotionStoppingCircles() {
  for (let circle of motionStoppingCircles) {
    if (isOpaque) {
      fill("rgba(0, 255, 0, 0.3)");
    } else {
      noFill();
    }
    ellipse(circle.x, circle.y, circle.slider.value() * 2);

    // Render labels only if isOpaque is true
    if (isOpaque) {
      textSize(12);
      textAlign(CENTER, CENTER);
      fill("white");
      text(`C${circle.label}`, circle.x - 15, circle.y - 15);
    }
  }
}

function drawScalingPoints() {
  for (let point of scalingPoints) {
    if (isOpaque) {
      fill("magenta");
    } else {
      noFill();
    }
    ellipse(point.x, point.y, 10);

    // Render labels only if isOpaque is true
    if (isOpaque) {
      textSize(12);
      textAlign(CENTER, CENTER);
      fill("white");
      text(`S${point.label}`, point.x - 15, point.y - 15);
    }
  }
}

function clearAll() {
  // Remove all attraction point sliders
  attractionPoints.forEach((point) => {
    point.slider.parent().remove();
  });

  // Remove all motion-stopping circle sliders
  motionStoppingCircles.forEach((circle) => {
    circle.slider.parent().remove();
  });

  // Remove all scaling point sliders
  scalingPoints.forEach((point) => {
    point.intensitySlider.parent().remove();
  });

  // Clear all arrays
  attractionPoints = [];
  motionStoppingCircles = [];
  scalingPoints = [];
  interactions = [];
  selectedItem = null;
}

function deleteSelected() {
  if (selectedItem) {
    if (selectedItem.type === "attraction") {
      // Remove the DOM elements of the slider
      selectedItem.item.slider.parent().remove();
      // Remove the point from the array
      attractionPoints = attractionPoints.filter(
        (p) => p !== selectedItem.item
      );
    } else if (selectedItem.type === "circle") {
      // Remove the DOM elements of the slider
      selectedItem.item.slider.parent().remove();
      // Remove the circle from the array
      motionStoppingCircles = motionStoppingCircles.filter(
        (c) => c !== selectedItem.item
      );
    } else if (selectedItem.type === "scaling") {
      // Remove the DOM elements of the slider
      selectedItem.item.intensitySlider.parent().remove();
      // Remove the point from the array
      scalingPoints = scalingPoints.filter((p) => p !== selectedItem.item);
    }

    // Deselect the current item
    selectedItem = null;
  }
}

function mousePressed(event) {
  if (
    mouseX > 0 &&
    mouseX < width &&
    mouseY > 0 &&
    mouseY < height &&
    !event.target.closest("#control-panel")
  ) {
    let foundItem = false;

    isDragging = null;
    draggingCircle = null;
    draggingScalePoint = null;

    attractionPoints.forEach((point, i) => {
      if (dist(mouseX, mouseY, point.x, point.y) < 10) {
        selectedItem = { item: point, type: "attraction" };
        isDragging = i;
        foundItem = true;
      }
    });

    motionStoppingCircles.forEach((circle, i) => {
      if (dist(mouseX, mouseY, circle.x, circle.y) < circle.slider.value()) {
        selectedItem = { item: circle, type: "circle" };
        draggingCircle = i;
        foundItem = true;
      }
    });

    scalingPoints.forEach((point, i) => {
      if (dist(mouseX, mouseY, point.x, point.y) < 10) {
        selectedItem = { item: point, type: "scaling" };
        draggingScalePoint = i;
        foundItem = true;
      }
    });

    if (!foundItem) {
      selectedItem = null;
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
