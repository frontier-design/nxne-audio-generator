# NXNE Interactive Audio-Visual Sketch

This project is an interactive audio-visual experience created using p5.js and p5.sound.js for [NXNE Music Festival](https://www.nxne.com/). 
It combines user interaction, audio-driven animations, and visual effects to create a dynamic canvas. Users can upload images and audio, manipulate 
various parameters to produce unique visual compositions. The sketch is also equipped with playback and recording functionality. It records the p5 canvas,
exports it as .webm, using CloudConvert API converts the file into an .mp4 and generates a download link.

---

## Features

### Audio-Driven Visualization
- Upload your audio file to generate real-time audio spectrum analysis.
- The sketch uses an FFT (Fast Fourier Transform) algorithm to analyze audio frequencies and drive visual effects.

### Image Slicing
- Upload an image to create a grid of sliced segments.
- Adjustable number of slices via a slider.
- The grid reacts dynamically to attraction points, motion-stopping circles, and scaling points.

### Interaction Points
- **Attraction Points**: Draw slices toward their positions based on intensity and distance.
- **Motion-Stopping Circles**: Reduce the movement of slices within their radius.
- **Scaling Points**: Adjust the size of slices dynamically based on distance and audio intensity.

### Customization Controls
- Change the background color using a color picker.
- Toggle slice opacity to switch between transparent and filled modes.
- Adjust interaction radii and damping factors to fine-tune the effects.

### Playback and Recording
- Play and stop the audio with a dedicated button.
- Record canvas animations and download them as a `.mp4` file.

### Dynamic Controls Panel
- Easily add or remove attraction points, motion-stopping circles, and scaling points.
- Clear all elements or delete specific ones.
- Real-time sliders for intensity and radius adjustments.

---

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, etc.)
- Basic knowledge of HTML, CSS, and JavaScript (if customizing the code).

### Installation
```bash
git clone https://github.com/[your-username]/interactive-sketch.git
cd interactive-sketch
```

Open the `index.html` file in your browser to start the sketch.

---

## File Structure

```
interactive-sketch/
├── assets/
│   ├── audio/          # Sample audio file
│   ├── images/         # Sample images
├── libraries/          # p5.js and p5.sound.js libraries
├── style.css           # Custom styles for the control panel
├── index.html          # Main HTML file
├── sketch.js           # JavaScript file for the sketch (uses p5)
├── record.js           # Script for recording canvas animations
└── README.md           # Documentation
```

---

## Technical Details

### Smooth Spectrum
- A smoothing algorithm is implemented to reduce jitter in the audio spectrum visualization.

### Grid Animation
- The grid dynamically reacts to interaction points based on:
  - **Distance**: Closer points have a stronger influence.
  - **Audio Intensity**: The FFT spectrum drives movement and scaling.
  - **Damping**: Motion-stopping circles dampen movement within their radius.

### Controls Panel
- Built using DOM elements for easy interaction.
- Sliders and buttons allow real-time updates to the canvas.

---

## Known Issues and Limitations
- The audio file needs to be uploaded in a compatible format (e.g., `.mp3`, `.wav`).
- Performance may degrade with large images or complex interactions.

---

## Future Improvements
- Add support for saving and loading configurations.
- Optimize performance for higher resolutions and larger datasets.

---

## License
This project is open-source and available under the [MIT License](LICENSE).

---

## Author
Yigir Toprak
- GitHub: [ygt-design](https://github.com/ygt-design)  
- Portfolio: [yigit.world](https://yigit.world/)

 


