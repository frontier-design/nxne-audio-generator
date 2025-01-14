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
let pathHistories = []; // Array to store path histories for each tile
let pathLengthSlider;
let selectedItem = null; // Store the last clicked item (point or circle)
let interactions = [];

let dampingValue = 0.7;
let lastClearTime = 0; // Store the last time the background was cleared

function preload() {
  img = loadImage("assets/images/runTheJewel.png");
  song = loadSound("assets/audio/Fall Murders Summer DEMO MAS1.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  fft = new p5.FFT();

  // Select elements
  playButton = select("#play-button");
  playButton.mousePressed(togglePlay);
  document
    .getElementById("toggle-opacity-button")
    .addEventListener("click", toggleOpacity);

  document.getElementById("clear-button").addEventListener("click", clearAll);

  sliceSlider = select("#slice-slider");
  radiusSlider = select("#radius-slider");
  scaleRadiusSlider = select("#scale-radius-slider");
  dampingSlider = select("#damping-slider");
  dampingSlider.input(() => {
    dampingValue = float(dampingSlider.value());
  });

  pathLengthSlider = select("#path-length-slider"); // Select path length slider

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
  let pathLength = pathLengthSlider.value(); // Get path length from slider

  if (originalPositions.length !== numSlices * numSlices) {
    originalPositions = [];
    animatedPositions = [];
    pathHistories = [];
    let imgX = (width - img.width) / 2;
    let imgY = (height - img.height) / 2;

    for (let y = 0; y < numSlices; y++) {
      for (let x = 0; x < numSlices; x++) {
        let posX = imgX + x * baseSliceWidth;
        let posY = imgY + y * baseSliceHeight;
        originalPositions.push({ x: posX, y: posY });
        animatedPositions.push({ x: posX, y: posY });
        pathHistories.push([]); // Initialize empty history for each tile
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

      // Apply attraction points' influence
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

      // Apply motion-stopping circles' damping effect
      let damping = dampingValue;
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
            damping
          );

          cumulativeEffectX *= dampingFactor;
          cumulativeEffectY *= dampingFactor;
        }
      }

      // Apply scaling points' influence
      for (let scalePoint of scalingPoints) {
        let distance = dist(scalePoint.x, scalePoint.y, targetX, targetY);
        let scaleRadius = scaleRadiusSlider.value();

        if (distance < scaleRadius) {
          // Get frequency band index based on distance
          let freqIndex = floor(
            map(distance, 0, width, 0, smoothSpectrum.length)
          );
          freqIndex = constrain(freqIndex, 0, smoothSpectrum.length - 1);

          // Get the intensity from the audio spectrum
          let audioIntensity = map(
            smoothSpectrum[freqIndex],
            0,
            255,
            1,
            scalePoint.intensitySlider.value()
          );

          // Calculate scaling factor using both distance and audio intensity
          let scalingFactor = map(
            distance,
            0,
            scaleRadius,
            audioIntensity, // Use audio intensity as max scaling
            0.2 // Min scaling when at the edge of the radius
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

      // Store the current position and scale in the path history
      if (pathLength > 0) {
        pathHistories[index].push({
          x: animatedPositions[index].x + baseSliceWidth / 2,
          y: animatedPositions[index].y + baseSliceHeight / 2,
          scale: scaleFactor,
        });

        // Ensure the path history length matches the path length slider value
        while (pathHistories[index].length > pathLength) {
          pathHistories[index].shift();
        }

        // Draw the path for the current tile
        for (let i = 0; i < pathHistories[index].length; i++) {
          let pos = pathHistories[index][i];
          let opacity = map(i, 0, pathHistories[index].length, 50, 255); // Gradual fade
          push();
          translate(pos.x, pos.y);
          scale(pos.scale);
          tint(255, opacity); // Apply fading effect
          imageMode(CENTER);
          copy(
            img,
            x * baseSliceWidth,
            y * baseSliceHeight,
            baseSliceWidth,
            baseSliceHeight,
            0,
            0,
            baseSliceWidth,
            baseSliceHeight
          );
          pop();
        }
      }

      // Draw the current tile at its animated position
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
  interactions.push({ item: newPoint, type: "attraction" });

  console.log("Interactions:", interactions);
}

function addMotionStoppingCircle() {
  let newCircle = {
    x: random(width),
    y: random(height),
    slider: createSlider(50, 300, 150),
  };
  newCircle.slider.parent(document.getElementById("intensity-panel"));
  motionStoppingCircles.push(newCircle);
  interactions.push({ item: newCircle, type: "circle" });

  console.log("Interactions:", interactions);
}

function addScalingPoint() {
  let newPoint = { x: width / 3, y: height / 3 };
  let intensitySlider = createSlider(0.5, 10, 1, 0.1);
  intensitySlider.parent(document.getElementById("intensity-panel"));

  newPoint.intensitySlider = intensitySlider;
  scalingPoints.push(newPoint);
  interactions.push({ item: newPoint, type: "scaling" });

  console.log("Interactions:", interactions);
}

function drawAttractionPoints() {
  for (let point of attractionPoints) {
    if (
      selectedItem &&
      selectedItem.item === point &&
      selectedItem.type === "attraction"
    ) {
      stroke(255); // White stroke for selected item
      strokeWeight(2);
    } else {
      noStroke();
    }
    fill(isOpaque ? "red" : "rgba(255, 0, 0, 0)");
    ellipse(point.x, point.y, 10);
  }
}

function drawScalingPoints() {
  for (let point of scalingPoints) {
    if (
      selectedItem &&
      selectedItem.item === point &&
      selectedItem.type === "scaling"
    ) {
      stroke(255); // White stroke for selected item
      strokeWeight(2);
    } else {
      noStroke();
    }
    fill(isOpaque ? "magenta" : "rgba(255, 0, 0, 0)");
    ellipse(point.x, point.y, 10);
  }
}

function drawMotionStoppingCircles() {
  for (let circle of motionStoppingCircles) {
    if (
      selectedItem &&
      selectedItem.item === circle &&
      selectedItem.type === "circle"
    ) {
      stroke(255); // White stroke for selected item
      strokeWeight(2);
    } else {
      noStroke();
    }
    fill(isOpaque ? "rgba(0, 255, 0, 0.3)" : "rgba(0, 255, 0, 0)");
    ellipse(circle.x, circle.y, circle.slider.value() * 2);
  }
}

function clearAll() {
  // Clear the arrays storing interaction points and circles
  attractionPoints = [];
  scalingPoints = [];
  motionStoppingCircles = [];
  interactions = [];
  selectedItem = null;

  // Remove only the sliders from the intensity panel
  let sliders = selectAll("input[type='range']", "#intensity-panel");
  sliders.forEach((slider) => slider.remove());
}

function mousePressed() {
  let foundItem = false; // Flag to track if an item was found

  // Clear previous selection and dragging variables
  selectedItem = null;
  isDragging = null;
  draggingCircle = null;
  draggingScalePoint = null;

  // Check for attraction points
  attractionPoints.forEach((point, i) => {
    console.log(`Checking attraction point ${i} at (${point.x}, ${point.y})`);
    if (dist(mouseX, mouseY, point.x, point.y) < 10) {
      selectedItem = { item: point, type: "attraction" };
      isDragging = i;
      foundItem = true;
    }
  });

  // Check for motion-stopping circles
  motionStoppingCircles.forEach((circle, i) => {
    console.log(`Checking circle ${i} at (${circle.x}, ${circle.y})`);
    if (dist(mouseX, mouseY, circle.x, circle.y) < circle.slider.value()) {
      selectedItem = { item: circle, type: "circle" };
      draggingCircle = i;
      foundItem = true;
    }
  });

  // Check for scaling points
  scalingPoints.forEach((point, i) => {
    console.log(`Checking scaling point ${i} at (${point.x}, ${point.y})`);
    if (dist(mouseX, mouseY, point.x, point.y) < 10) {
      selectedItem = { item: point, type: "scaling" };
      draggingScalePoint = i;
      foundItem = true;
    }
  });

  // If no item is found, clear the selection
  if (!foundItem) {
    selectedItem = null;
  }

  // Log the selected item and mouse position for debugging
  console.log("Mouse clicked at:", mouseX, mouseY);
  console.log("Mouse pressed. Selected item:", selectedItem);
}

console.log("Selected Item Reference:", selectedItem);
console.log("Interactions Array:", interactions);

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
