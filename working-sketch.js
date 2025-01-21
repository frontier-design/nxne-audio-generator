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
let colorPathHistories = [];

let isDragging = null;
let draggingCircle = null;
let draggingScalePoint = null;
let selectedItem = null;

let isOpaque = true;
let isPlaying = false;

let dampingValue = 0.7;
let lastClearTime = 0;
let attractionIndex = 1;
let circleIndex = 1;
let scalingIndex = 1;

let youtubePlayer;
let youtubeAudioLoaded = false;
let videoElement;
let isVideoLoaded = false;

let capture;
let recording = false;

let layerColor = "#00ff00"; // Default layer color

function extractYouTubeID(url) {
  const regExp = /^.*(?:youtu\.be\/|v\/|embed\/|watch\?v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[1].length === 11 ? match[1] : null;
}

function preload() {
  img = loadImage("assets/images/murathanE.png");
  song = loadSound("assets/audio/Fall Murders Summer DEMO MAS1.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  fft = new p5.FFT();

  playButton = select("#play-button");
  playButton.mousePressed(togglePlay);

  select("#start-recording").mousePressed(startRecording);
  select("#stop-recording").mousePressed(stopRecording);

  select("#audio-input").changed(handleAudioUpload);
  select("#video-input").changed(handleVideoUpload);
  select("#youtube-load-button").mousePressed(loadYouTubeAudio);

  initializeControls();
  addAttractionPoint();
  imageMode(CENTER);
}

function draw() {
  background(bgColorPicker.value());

  // Analyze the audio spectrum
  let spectrum = fft.analyze();
  smoothSpectrum(spectrum);

  // Process visual effects
  processVisualEffects();

  // Draw the attraction points, circles, and scaling points
  drawAttractionPoints();
  drawMotionStoppingCircles();
  drawScalingPoints();

  // Recording process
  if (recording && capture) {
    try {
      capture.capture(document.querySelector("canvas"));
    } catch (error) {
      console.error("Error during capture:", error);
    }
  }
}

function startRecording() {
  if (!recording) {
    capture = new CCapture({
      format: "webm",
      framerate: 30,
      verbose: true, // Enables logging for debugging
      quality: 100, // High-quality output
      autoSaveTime: 0, // Avoid premature saving
    });

    frameRate(30); // Lock frame rate for consistent recording
    capture.start();
    recording = true;
    console.log("Recording started...");
  }
}

function stopRecording() {
  if (recording) {
    console.log("Finalizing recording...");
    capture.stop();
    setTimeout(() => {
      try {
        capture.save(); // Save recording after a delay
        console.log("Recording saved.");
      } catch (error) {
        console.error("Error during saving:", error);
      }
    }, 100); // Allow time for processing
    recording = false;
    frameRate(60); // Restore frame rate after recording
  }
}

function smoothSpectrum(spectrum) {
  if (previousSpectrum.length === 0) {
    previousSpectrum = spectrum.slice();
  }

  let alpha = 0.3; // Smoothing factor
  for (let i = 0; i < spectrum.length; i++) {
    previousSpectrum[i] =
      alpha * spectrum[i] + (1 - alpha) * previousSpectrum[i];
  }
  return previousSpectrum;
}

function handleImageUpload(event) {
  let file = event.target.files[0];
  if (file && file.type.startsWith("image")) {
    img = loadImage(URL.createObjectURL(file), () => {
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
  const file = event.target.files[0];
  if (file && file.type.startsWith("audio")) {
    if (song) {
      song.stop();
    }
    song = loadSound(URL.createObjectURL(file), () => {
      fft = new p5.FFT();
      isPlaying = false;
      document.getElementById("play-button").innerText = "Play";
    });
  }
}

function handleVideoUpload(event) {
  const file = event.target.files[0];
  if (file && file.type.startsWith("video")) {
    const url = URL.createObjectURL(file);
    videoElement = createVideo(url, () => {
      videoElement.hide();
      fft = new p5.FFT();
    });
    videoElement.volume(1);
  }
}

function onVideoLoaded() {
  video.loop();
  isVideoLoaded = true;
  console.log("Video loaded successfully");
}

function loadYouTubeAudio() {
  const urlInput = document.getElementById("youtube-url").value;

  if (!urlInput) {
    alert("Please enter a YouTube URL.");
    return;
  }

  const videoId = extractYouTubeID(urlInput);
  if (!videoId) {
    alert("Invalid YouTube URL.");
    return;
  }

  const youtubePlayerElement = document.getElementById("youtube-player");
  youtubePlayerElement.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${location.origin}`;

  youtubeAudioLoaded = true;
  isPlaying = false;
  document.getElementById("play-button").innerText = "Play";

  youtubePlayer = new YT.Player("youtube-player", {
    events: {
      onReady: () => {
        alert("YouTube video loaded successfully!");
        console.log("YouTube Player Loaded");
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.PLAYING) {
          isPlaying = true;
          document.getElementById("play-button").innerText = "Stop";
        } else if (
          event.data === YT.PlayerState.PAUSED ||
          event.data === YT.PlayerState.ENDED
        ) {
          isPlaying = false;
          document.getElementById("play-button").innerText = "Play";
        }
      },
      onError: (error) => {
        console.error("YouTube Player Error:", error);
      },
    },
  });
}

function setupYouTubeAudio(videoId) {
  const audioUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const hiddenAudioElement = createAudio(audioUrl);
  hiddenAudioElement.id("youtube-audio");
  hiddenAudioElement.hide();
  hiddenAudioElement.loop(false);

  hiddenAudioElement.play();
  fft.setInput(hiddenAudioElement);
}

function togglePlay() {
  if (recording) {
    console.log("Recording in progress... Ensure playback is synced.");
  }

  if (youtubeAudioLoaded && youtubePlayer) {
    if (!isPlaying) {
      youtubePlayer.playVideo();
      isPlaying = true;
      document.getElementById("play-button").innerText = "Stop";
    } else {
      youtubePlayer.pauseVideo();
      isPlaying = false;
      document.getElementById("play-button").innerText = "Play";
    }
  } else if (song && song.isPlaying()) {
    song.stop();
    isPlaying = false;
    document.getElementById("play-button").innerText = "Play";
  } else if (song) {
    song.loop();
    isPlaying = true;
    document.getElementById("play-button").innerText = "Stop";
  } else if (videoElement) {
    if (!isPlaying) {
      videoElement.play();
      isPlaying = true;
      document.getElementById("play-button").innerText = "Stop";
    } else {
      videoElement.pause();
      isPlaying = false;
      document.getElementById("play-button").innerText = "Play";
    }
  } else {
    alert(
      "No audio source loaded. Please upload an audio file or load a YouTube video."
    );
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

  let sliderContainer = createDiv();
  sliderContainer.style("display", "flex");
  sliderContainer.style("align-items", "center");

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

  let sliderContainer = createDiv();
  sliderContainer.style("display", "flex");
  sliderContainer.style("align-items", "center");

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

  let sliderContainer = createDiv();
  sliderContainer.style("display", "flex");
  sliderContainer.style("align-items", "center");

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

    if (isOpaque) {
      textSize(12);
      textAlign(CENTER, CENTER);
      fill("white");
      text(`S${point.label}`, point.x - 15, point.y - 15);
    }
  }
}

function clearAll() {
  attractionPoints.forEach((point) => {
    point.slider.parent().remove();
  });

  motionStoppingCircles.forEach((circle) => {
    circle.slider.parent().remove();
  });

  scalingPoints.forEach((point) => {
    point.intensitySlider.parent().remove();
  });

  attractionPoints = [];
  motionStoppingCircles = [];
  scalingPoints = [];
  interactions = [];
  selectedItem = null;
}

function deleteSelected() {
  if (selectedItem) {
    if (selectedItem.type === "attraction") {
      selectedItem.item.slider.parent().remove();

      attractionPoints = attractionPoints.filter(
        (p) => p !== selectedItem.item
      );
    } else if (selectedItem.type === "circle") {
      selectedItem.item.slider.parent().remove();

      motionStoppingCircles = motionStoppingCircles.filter(
        (c) => c !== selectedItem.item
      );
    } else if (selectedItem.type === "scaling") {
      selectedItem.item.intensitySlider.parent().remove();

      scalingPoints = scalingPoints.filter((p) => p !== selectedItem.item);
    }

    selectedItem = null;
  }
}

function processVisualEffects() {
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

  if (originalPositions.length !== numSlices * numSlices) {
    originalPositions = [];
    animatedPositions = [];
    pathHistories = [];
    colorPathHistories = [];

    for (let y = 0; y < numSlices; y++) {
      for (let x = 0; x < numSlices; x++) {
        let posX = imgTopLeftX + x * baseSliceWidth;
        let posY = imgTopLeftY + y * baseSliceHeight;
        originalPositions.push({ x: posX, y: posY });
        animatedPositions.push({ x: posX, y: posY });
        pathHistories.push([]);
        colorPathHistories.push([]);
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

      let colorEffectX = 0;
      let colorEffectY = 0;
      let colorScaleFactor = 1;

      for (let point of attractionPoints) {
        let distance = dist(point.x, point.y, targetX, targetY);
        if (distance < radiusSlider.value()) {
          let distanceFactor = map(distance, 0, radiusSlider.value(), 10, 0.1);
          let intensity = map(
            previousSpectrum[
              floor(map(distance, 0, width, 0, previousSpectrum.length))
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

          colorEffectX += dx * distanceFactor * 2;
          colorEffectY += dy * distanceFactor * 2;
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

          colorEffectX *= dampingFactor * 0.9;
          colorEffectY *= dampingFactor * 0.9;
        }
      }

      for (let scalePoint of scalingPoints) {
        let distance = dist(scalePoint.x, scalePoint.y, targetX, targetY);
        let scaleRadius = scaleRadiusSlider.value();

        if (distance < scaleRadius) {
          let freqIndex = floor(
            map(distance, 0, width, 0, previousSpectrum.length)
          );
          freqIndex = constrain(freqIndex, 0, previousSpectrum.length - 1);

          let audioIntensity = map(
            previousSpectrum[freqIndex],
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
          colorScaleFactor *= scalingFactor * 1.2;
        }
      }

      let finalSliceWidth = baseSliceWidth * sliceScaleFactor;
      let finalSliceHeight = baseSliceHeight * sliceScaleFactor;

      let finalColorWidth = baseSliceWidth * colorScaleFactor;
      let finalColorHeight = baseSliceHeight * colorScaleFactor;

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

      let colorX = lerp(
        animatedPositions[index].x,
        targetX + colorEffectX,
        0.2
      );
      let colorY = lerp(
        animatedPositions[index].y,
        targetY + colorEffectY,
        0.2
      );

      if (pathLength > 0) {
        pathHistories[index].push({
          x: animatedPositions[index].x,
          y: animatedPositions[index].y,
          scale: sliceScaleFactor,
        });

        colorPathHistories[index].push({
          x: colorX,
          y: colorY,
          scale: colorScaleFactor,
        });

        while (pathHistories[index].length > pathLength) {
          pathHistories[index].shift();
        }

        while (colorPathHistories[index].length > pathLength) {
          colorPathHistories[index].shift();
        }

        // Draw color path histories using selected color
        for (let i = 0; i < colorPathHistories[index].length; i++) {
          let pos = colorPathHistories[index][i];
          push();
          translate(pos.x + baseSliceWidth / 2, pos.y + baseSliceHeight / 2);
          scale(pos.scale);
          rectMode(CENTER);
          fill(layerColor); // Use the selected color
          noStroke();
          rect(0, 0, finalColorWidth, finalColorHeight);
          pop();
        }
      }

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
}

function initializeControls() {
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

  const layerColorPicker = document.getElementById("layer-color-picker");
  layerColorPicker.addEventListener("input", (event) => {
    layerColor = event.target.value;
  });
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

function keyPressed() {
  if (key === "s" || key === "S") {
    saveCanvas("NXNE_Sketch", "jpg");
  }
}
