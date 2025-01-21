let visual = {
  img: null,
  fft: null,
  bgColorPicker: null,
  isOpaque: true,
};

let audio = {
  song: null,
  youtubePlayer: null,
  youtubeAudioLoaded: false,
  videoElement: null,
  isVideoLoaded: false,
  isPlaying: false,
};

let controls = {
  playButton: null,
  sliceSlider: null,
  dampingSlider: null,
  scaleRadiusSlider: null,
  radiusSlider: null,
  pathLengthSlider: null,
  addPointButton: null,
  addCircleButton: null,
  addScalePointButton: null,
};

let points = {
  attractionPoints: [],
  motionStoppingCircles: [],
  scalingPoints: [],
  pathHistories: [],
  colorPathHistories: [],
};

let state = {
  originalPositions: [],
  animatedPositions: [],
  previousSpectrum: [],
  interactions: [],
  isDragging: null,
  draggingCircle: null,
  draggingScalePoint: null,
  selectedItem: null,
};

let indices = {
  attractionIndex: 1,
  circleIndex: 1,
  scalingIndex: 1,
};

let recording = {
  capture: null,
  isRecording: false,
};

let constants = {
  dampingValue: 0.7,
  maxDimension: 700,
};

let debug = {
  lastClearTime: 0,
};

function extractYouTubeID(url) {
  const regExp = /^.*(?:youtu\.be\/|v\/|embed\/|watch\?v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[1].length === 11 ? match[1] : null;
}

function preload() {
  visual.img = loadImage(
    "assets/images/murathanE.png",
    () => {
      console.log("Image loaded successfully");
    },
    () => {
      console.error("Failed to load the image");
    }
  );
  audio.song = loadSound("assets/audio/Fall Murders Summer DEMO MAS1.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);

  visual.fft = new p5.FFT();

  controls.playButton = select("#play-button");
  controls.playButton.mousePressed(togglePlay);

  select("#start-recording").mousePressed(startRecording);
  select("#stop-recording").mousePressed(stopRecording);

  select("#audio-input").changed(handleAudioUpload);
  // select("#video-input").changed(handleVideoUpload);
  // select("#youtube-load-button").mousePressed(loadYouTubeAudio);

  initializeControls();
  addAttractionPoint(); // Add initial attraction point
  imageMode(CENTER);
}

function draw() {
  background(visual.bgColorPicker?.value() || "#000000");

  // Draw the image if it exists
  if (visual.img) {
    imageMode(CENTER);
    image(
      visual.img,
      width / 2,
      height / 2,
      visual.img.width,
      visual.img.height
    );
  }

  // Analyze the audio spectrum
  let spectrum = visual.fft.analyze();
  state.previousSpectrum = smoothSpectrum(spectrum);

  // Process visual effects
  processVisualEffects();

  // Draw the attraction points, circles, and scaling points
  drawAttractionPoints();
  drawMotionStoppingCircles();
  drawScalingPoints();

  // Recording process
  if (recording.isRecording && recording.capture) {
    try {
      recording.capture.capture(document.querySelector("canvas"));
    } catch (error) {
      console.error("Error during capture:", error);
    }
  }
}

function startRecording() {
  if (!recording.isRecording) {
    recording.capture = new CCapture({
      format: "webm",
      framerate: 30,
      verbose: true, // Enables logging for debugging
      quality: 100, // High-quality output
      autoSaveTime: 0, // Avoid premature saving
    });

    frameRate(30); // Lock frame rate for consistent recording
    recording.capture.start();
    recording.isRecording = true;
    console.log("Recording started...");
  }
}

function stopRecording() {
  if (recording.isRecording) {
    console.log("Finalizing recording...");
    recording.capture.stop();
    setTimeout(() => {
      try {
        recording.capture.save(); // Save recording after a delay
        console.log("Recording saved.");
      } catch (error) {
        console.error("Error during saving:", error);
      }
    }, 100); // Allow time for processing
    recording.isRecording = false;
    frameRate(60); // Restore frame rate after recording
  }
}

function smoothSpectrum(spectrum) {
  if (state.previousSpectrum.length === 0) {
    state.previousSpectrum = spectrum.slice();
  }

  let alpha = 0.3; // Smoothing factor
  for (let i = 0; i < spectrum.length; i++) {
    state.previousSpectrum[i] =
      alpha * spectrum[i] + (1 - alpha) * state.previousSpectrum[i];
  }
  return state.previousSpectrum;
}

function handleImageUpload(event) {
  let file = event.target.files[0];
  if (file && file.type.startsWith("image")) {
    visual.img = loadImage(URL.createObjectURL(file), () => {
      let numSlices = controls.sliceSlider.value();

      let maxDimension = 700;
      let scaleFactor = Math.min(
        1,
        maxDimension / visual.img.width,
        maxDimension / visual.img.height
      );

      let displayWidth = visual.img.width * scaleFactor;
      let displayHeight = visual.img.height * scaleFactor;

      let baseSliceWidth = Math.round(displayWidth / numSlices);
      let baseSliceHeight = Math.round(displayHeight / numSlices);

      displayWidth = baseSliceWidth * numSlices;
      displayHeight = baseSliceHeight * numSlices;

      let imgTopLeftX = (width - displayWidth) / 2;
      let imgTopLeftY = (height - displayHeight) / 2;

      state.originalPositions = [];
      state.animatedPositions = [];
      state.pathHistories = [];

      for (let y = 0; y < numSlices; y++) {
        for (let x = 0; x < numSlices; x++) {
          let posX = imgTopLeftX + x * baseSliceWidth;
          let posY = imgTopLeftY + y * baseSliceHeight;
          state.originalPositions.push({ x: posX, y: posY });
          state.animatedPositions.push({ x: posX, y: posY });
          state.pathHistories.push([]);
        }
      }
    });
  }
}

function handleAudioUpload(event) {
  const file = event.target.files[0];
  if (file && file.type.startsWith("audio")) {
    if (audio.song) {
      audio.song.stop();
    }
    audio.song = loadSound(URL.createObjectURL(file), () => {
      visual.fft = new p5.FFT();
      audio.isPlaying = false;
      document.getElementById("play-button").innerText = "Play";
    });
  }
}

// function handleVideoUpload(event) {
//   const file = event.target.files[0];
//   if (file && file.type.startsWith("video")) {
//     const url = URL.createObjectURL(file);
//     videoElement = createVideo(url, () => {
//       videoElement.hide();
//       fft = new p5.FFT();
//     });
//     videoElement.volume(1);
//   }
// }

// function onVideoLoaded() {
//   video.loop();
//   isVideoLoaded = true;
//   console.log("Video loaded successfully");
// }

// function loadYouTubeAudio() {
//   const urlInput = document.getElementById("youtube-url").value;

//   if (!urlInput) {
//     alert("Please enter a YouTube URL.");
//     return;
//   }

//   const videoId = extractYouTubeID(urlInput);
//   if (!videoId) {
//     alert("Invalid YouTube URL.");
//     return;
//   }

//   const youtubePlayerElement = document.getElementById("youtube-player");
//   youtubePlayerElement.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${location.origin}`;

//   youtubeAudioLoaded = true;
//   isPlaying = false;
//   document.getElementById("play-button").innerText = "Play";

//   youtubePlayer = new YT.Player("youtube-player", {
//     events: {
//       onReady: () => {
//         alert("YouTube video loaded successfully!");
//         console.log("YouTube Player Loaded");
//       },
//       onStateChange: (event) => {
//         if (event.data === YT.PlayerState.PLAYING) {
//           isPlaying = true;
//           document.getElementById("play-button").innerText = "Stop";
//         } else if (
//           event.data === YT.PlayerState.PAUSED ||
//           event.data === YT.PlayerState.ENDED
//         ) {
//           isPlaying = false;
//           document.getElementById("play-button").innerText = "Play";
//         }
//       },
//       onError: (error) => {
//         console.error("YouTube Player Error:", error);
//       },
//     },
//   });
// }

// function setupYouTubeAudio(videoId) {
//   const audioUrl = `https://www.youtube.com/watch?v=${videoId}`;
//   const hiddenAudioElement = createAudio(audioUrl);
//   hiddenAudioElement.id("youtube-audio");
//   hiddenAudioElement.hide();
//   hiddenAudioElement.loop(false);

//   hiddenAudioElement.play();
//   fft.setInput(hiddenAudioElement);
// }

function togglePlay() {
  if (recording.isRecording) {
    console.log("Recording in progress... Ensure playback is synced.");
  }

  if (audio.youtubeAudioLoaded && audio.youtubePlayer) {
    if (!audio.isPlaying) {
      audio.youtubePlayer.playVideo();
      audio.isPlaying = true;
      document.getElementById("play-button").innerText = "Stop";
    } else {
      audio.youtubePlayer.pauseVideo();
      audio.isPlaying = false;
      document.getElementById("play-button").innerText = "Play";
    }
  } else if (audio.song && audio.song.isPlaying()) {
    audio.song.stop();
    audio.isPlaying = false;
    document.getElementById("play-button").innerText = "Play";
  } else if (audio.song) {
    audio.song.loop();
    audio.isPlaying = true;
    document.getElementById("play-button").innerText = "Stop";
  } else if (video.isLoaded && video.element) {
    if (!audio.isPlaying) {
      video.element.play();
      audio.isPlaying = true;
      document.getElementById("play-button").innerText = "Stop";
    } else {
      video.element.pause();
      audio.isPlaying = false;
      document.getElementById("play-button").innerText = "Play";
    }
  } else {
    alert(
      "No audio source loaded. Please upload an audio file or load a YouTube video."
    );
  }
}

function toggleOpacity() {
  state.isOpaque = !state.isOpaque;
  console.log(`Opacity toggled: ${state.isOpaque ? "Opaque" : "Transparent"}`);
}

function addAttractionPoint() {
  let newPoint = {
    x: width / 2,
    y: height / 2,
    slider: createSlider(0, 500, 250),
    label: indices.attractionIndex,
  };

  let sliderContainer = createDiv();
  sliderContainer.style("display", "flex");
  sliderContainer.style("align-items", "center");

  let sliderLabel = createDiv(`A${indices.attractionIndex}`);
  sliderLabel.style("color", "red");
  sliderLabel.style("margin-left", "8px");
  sliderLabel.style("background-color", "rgba(255, 0, 0, 0.3)");
  sliderLabel.style("padding", "1px 3px");

  newPoint.slider.parent(sliderContainer);
  sliderLabel.parent(sliderContainer);
  sliderContainer.parent(document.getElementById("intensity-panel"));

  points.attractionPoints.push(newPoint);
  indices.attractionIndex++;
}

function addMotionStoppingCircle() {
  let newCircle = {
    x: random(width),
    y: random(height),
    slider: createSlider(50, 300, 150),
    label: state.circleIndex,
  };

  let sliderContainer = createDiv();
  sliderContainer.style("display", "flex");
  sliderContainer.style("align-items", "center");

  let sliderLabel = createDiv(`C${state.circleIndex}`);
  sliderLabel.style("color", "rgb(0,255,0)");
  sliderLabel.style("margin-left", "8px");
  sliderLabel.style("margin-top", "-15px");
  sliderLabel.style("background-color", "rgba(0, 255, 0, 0.3)");
  sliderLabel.style("padding", "1px 3px");

  newCircle.slider.parent(sliderContainer);
  sliderLabel.parent(sliderContainer);
  sliderContainer.parent(document.getElementById("intensity-panel"));

  visual.motionStoppingCircles.push(newCircle);
  state.circleIndex++;
}

function addScalingPoint() {
  let newPoint = {
    x: width / 3,
    y: height / 3,
    intensitySlider: createSlider(0.5, 10, 1, 0.1),
    label: state.scalingIndex,
  };

  let sliderContainer = createDiv();
  sliderContainer.style("display", "flex");
  sliderContainer.style("align-items", "center");

  let sliderLabel = createDiv(`S${state.scalingIndex}`);
  sliderLabel.style("color", "magenta");
  sliderLabel.style("margin-left", "8px");
  sliderLabel.style("margin-top", "-15px");
  sliderLabel.style("background-color", "rgba(255, 0, 255, 0.3)");
  sliderLabel.style("padding", "1px 3px");

  newPoint.intensitySlider.parent(sliderContainer);
  sliderLabel.parent(sliderContainer);
  sliderContainer.parent(document.getElementById("intensity-panel"));

  visual.scalingPoints.push(newPoint);
  state.scalingIndex++;
}

function drawAttractionPoints() {
  for (let point of points.attractionPoints) {
    if (visual.isOpaque) {
      fill("red");
    } else {
      noFill();
    }
    noStroke();
    ellipse(point.x, point.y, 10);

    if (visual.isOpaque) {
      textSize(12);
      textAlign(CENTER, CENTER);
      fill("white");
      text(`A${point.label}`, point.x - 15, point.y - 15);
    }
  }
}

function drawMotionStoppingCircles() {
  for (let circle of points.motionStoppingCircles) {
    if (visual.isOpaque) {
      fill("rgba(0, 255, 0, 0.3)");
    } else {
      noFill();
    }
    ellipse(circle.x, circle.y, circle.slider.value() * 2);

    if (visual.isOpaque) {
      textSize(12);
      textAlign(CENTER, CENTER);
      fill("white");
      text(`C${circle.label}`, circle.x - 15, circle.y - 15);
    }
  }
}

function drawScalingPoints() {
  for (let point of points.scalingPoints) {
    if (visual.isOpaque) {
      fill("magenta");
    } else {
      noFill();
    }
    ellipse(point.x, point.y, 10);

    if (visual.isOpaque) {
      textSize(12);
      textAlign(CENTER, CENTER);
      fill("white");
      text(`S${point.label}`, point.x - 15, point.y - 15);
    }
  }
}

function clearAll() {
  visual.attractionPoints.forEach((point) => {
    point.slider.parent().remove();
  });

  visual.motionStoppingCircles.forEach((circle) => {
    circle.slider.parent().remove();
  });

  visual.scalingPoints.forEach((point) => {
    point.intensitySlider.parent().remove();
  });

  visual.attractionPoints = [];
  visual.motionStoppingCircles = [];
  visual.scalingPoints = [];
  state.selectedItem = null;
}

function deleteSelected() {
  if (state.selectedItem) {
    if (state.selectedItem.type === "attraction") {
      state.selectedItem.item.slider.parent().remove();

      visual.attractionPoints = visual.attractionPoints.filter(
        (p) => p !== state.selectedItem.item
      );
    } else if (state.selectedItem.type === "circle") {
      state.selectedItem.item.slider.parent().remove();

      visual.motionStoppingCircles = visual.motionStoppingCircles.filter(
        (c) => c !== state.selectedItem.item
      );
    } else if (state.selectedItem.type === "scaling") {
      state.selectedItem.item.intensitySlider.parent().remove();

      visual.scalingPoints = visual.scalingPoints.filter(
        (p) => p !== state.selectedItem.item
      );
    }

    state.selectedItem = null;
  }
}

function processVisualEffects() {
  let numSlices = controls.sliceSlider.value();
  let scaleFactor = Math.min(
    1,
    constants.maxDimension / visual.img.width,
    constants.maxDimension / visual.img.height
  );

  let displayWidth = visual.img.width * scaleFactor;
  let displayHeight = visual.img.height * scaleFactor;

  let baseSliceWidth = Math.round(displayWidth / numSlices);
  let baseSliceHeight = Math.round(displayHeight / numSlices);

  displayWidth = baseSliceWidth * numSlices;
  displayHeight = baseSliceHeight * numSlices;

  let imgTopLeftX = (width - displayWidth) / 2;
  let imgTopLeftY = (height - displayHeight) / 2;

  if (state.originalPositions.length !== numSlices * numSlices) {
    state.originalPositions = [];
    state.animatedPositions = [];
    points.pathHistories = [];
    points.colorPathHistories = [];

    for (let y = 0; y < numSlices; y++) {
      for (let x = 0; x < numSlices; x++) {
        let posX = imgTopLeftX + x * baseSliceWidth;
        let posY = imgTopLeftY + y * baseSliceHeight;
        state.originalPositions.push({ x: posX, y: posY });
        state.animatedPositions.push({ x: posX, y: posY });
        points.pathHistories.push([]);
        points.colorPathHistories.push([]);
      }
    }
  }

  let pathLength = controls.pathLengthSlider.value();
  let index = 0;

  for (let y = 0; y < numSlices; y++) {
    for (let x = 0; x < numSlices; x++) {
      let targetX = state.originalPositions[index].x;
      let targetY = state.originalPositions[index].y;

      let cumulativeEffectX = 0;
      let cumulativeEffectY = 0;
      let sliceScaleFactor = 1;

      let colorEffectX = 0;
      let colorEffectY = 0;
      let colorScaleFactor = 1;

      for (let point of points.attractionPoints) {
        let distance = dist(point.x, point.y, targetX, targetY);
        if (distance < controls.radiusSlider.value()) {
          let distanceFactor = map(
            distance,
            0,
            controls.radiusSlider.value(),
            10,
            0.1
          );
          let intensity = map(
            state.previousSpectrum[
              floor(map(distance, 0, width, 0, state.previousSpectrum.length))
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

      for (let circle of points.motionStoppingCircles) {
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
            constants.dampingValue
          );

          cumulativeEffectX *= dampingFactor;
          cumulativeEffectY *= dampingFactor;

          colorEffectX *= dampingFactor * 0.9;
          colorEffectY *= dampingFactor * 0.9;
        }
      }

      let finalSliceWidth = baseSliceWidth * sliceScaleFactor;
      let finalSliceHeight = baseSliceHeight * sliceScaleFactor;

      let finalColorWidth = baseSliceWidth * colorScaleFactor;
      let finalColorHeight = baseSliceHeight * colorScaleFactor;

      state.animatedPositions[index].x = lerp(
        state.animatedPositions[index].x,
        targetX + cumulativeEffectX,
        0.2
      );
      state.animatedPositions[index].y = lerp(
        state.animatedPositions[index].y,
        targetY + cumulativeEffectY,
        0.2
      );

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

  controls.sliceSlider = select("#slice-slider");
  if (!controls.sliceSlider) {
    console.error("Slice slider (#slice-slider) not found!");
  }

  controls.radiusSlider = select("#radius-slider");
  if (!controls.radiusSlider) {
    console.error("Radius slider (#radius-slider) not found!");
  }

  controls.scaleRadiusSlider = select("#scale-radius-slider");
  if (!controls.scaleRadiusSlider) {
    console.error("Scale radius slider (#scale-radius-slider) not found!");
  }

  controls.dampingSlider = select("#damping-slider");
  if (!controls.dampingSlider) {
    console.error("Damping slider (#damping-slider) not found!");
  }

  controls.pathLengthSlider = select("#path-length-slider");
  if (!controls.pathLengthSlider) {
    console.error("Path length slider (#path-length-slider) not found!");
  }

  controls.addPointButton = select("#add-point-button");
  if (controls.addPointButton) {
    controls.addPointButton.mousePressed(addAttractionPoint);
  } else {
    console.error("Add point button (#add-point-button) not found!");
  }

  controls.addCircleButton = select("#add-circle-button");
  if (controls.addCircleButton) {
    controls.addCircleButton.mousePressed(addMotionStoppingCircle);
  } else {
    console.error("Add circle button (#add-circle-button) not found!");
  }

  controls.addScalePointButton = select("#add-scale-point-button");
  if (controls.addScalePointButton) {
    controls.addScalePointButton.mousePressed(addScalingPoint);
  } else {
    console.error(
      "Add scale point button (#add-scale-point-button) not found!"
    );
  }

  visual.bgColorPicker = select("#bg-color-picker");
  if (!visual.bgColorPicker) {
    console.error("Background color picker (#bg-color-picker) not found!");
  }

  let imageInput = select("#image-input");
  if (imageInput) {
    imageInput.changed(handleImageUpload);
  } else {
    console.error("Image input (#image-input) not found!");
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

    state.isDragging = null;
    state.draggingCircle = null;
    state.draggingScalePoint = null;

    if (points.attractionPoints) {
      points.attractionPoints.forEach((point, i) => {
        if (dist(mouseX, mouseY, point.x, point.y) < 10) {
          state.selectedItem = { item: point, type: "attraction" };
          state.isDragging = i;
          foundItem = true;
        }
      });
    }

    if (points.motionStoppingCircles) {
      points.motionStoppingCircles.forEach((circle, i) => {
        if (dist(mouseX, mouseY, circle.x, circle.y) < circle.slider.value()) {
          state.selectedItem = { item: circle, type: "circle" };
          state.draggingCircle = i;
          foundItem = true;
        }
      });
    }

    if (points.scalingPoints) {
      points.scalingPoints.forEach((point, i) => {
        if (dist(mouseX, mouseY, point.x, point.y) < 10) {
          state.selectedItem = { item: point, type: "scaling" };
          state.draggingScalePoint = i;
          foundItem = true;
        }
      });
    }

    if (!foundItem) {
      state.selectedItem = null;
    }
  }
}

function mouseDragged() {
  if (state.isDragging !== null) {
    visual.attractionPoints[state.isDragging].x = mouseX;
    visual.attractionPoints[state.isDragging].y = mouseY;
  }
  if (state.draggingCircle !== null) {
    visual.motionStoppingCircles[state.draggingCircle].x = mouseX;
    visual.motionStoppingCircles[state.draggingCircle].y = mouseY;
  }
  if (state.draggingScalePoint !== null) {
    visual.scalingPoints[state.draggingScalePoint].x = mouseX;
    visual.scalingPoints[state.draggingScalePoint].y = mouseY;
  }
}

function mouseReleased() {
  state.isDragging = null;
  state.draggingCircle = null;
  state.draggingScalePoint = null;
}

function keyPressed() {
  if (key === "s" || key === "S") {
    saveCanvas("NXNE_Sketch", "jpg");
  }
}
