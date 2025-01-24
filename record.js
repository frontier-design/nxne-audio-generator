const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const preview = document.getElementById("preview");
const downloadLink = document.getElementById("downloadLink");

let mediaRecorder;
let recordedChunks = [];
let recordingTimeout; // Timeout to stop recording automatically

// Replace with your CloudConvert API key
const CLOUDCONVERT_API_KEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYmMxNzNmOTFjZGNmMDVjYjNiYzc4ZWY1YWNjMzdmYzU4NTkzYWZmNTg3MmRkYWY3ODlkZDQyNTg5YzY5ZDg3YzgwYmVkN2Y2N2VkNjY1OWYiLCJpYXQiOjE3Mzc3NDg1NzguMDUwNzA2LCJuYmYiOjE3Mzc3NDg1NzguMDUwNzA4LCJleHAiOjQ4OTM0MjIxNzguMDQ3MDIzLCJzdWIiOiI3MDgzODI5NyIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ0YXNrLnJlYWQiLCJ0YXNrLndyaXRlIl19.mkTQCPfjt8PcYknj9Pm81RpoSDEPZw-Y6FY4Tl_fND1bjh0H4ZDC8T1L3PD3dUslZfuO2NdRXkN9cSEpcjG9EQyCyhDlortYRdzJWVK8XQbgpCc3jwioWhb8ChnzVF3LvBcnNnCSkVo3jA_SsiGukyJJSZrEcq2ryVXKxIGHLKOux3u3U3qgZFxBw8TE5qkUSAmv3-ILks6zM2Zx9et3KnSkfox-JoNzP07JMN-p3JsbMTECXwR2tEmKPd0sA1ZfLxxcFHX2ilOYzczFwqp9ME8_O6C-Vc1S7P8heAxdAehRoqFaoNyEQcm_cjZqvn1G1jQniLMTYWqfe6LZU0JYIn6xZZPSgZZVjhARs6U1vu4gyXkkG8fXDWQIjYiTGX2L5e7PHQ8lhFw-W8KeksCZigQSV0-oZaUXoZ0yQlKoS-b0adkM9V3uCTe6GV4iDbwPHseCReADkLTR0GpqOaH2sQVLw8eru_OTdBI3Jv8V4bsp1cb0HUAyQZQ2movJ6j0ags3d4c42o0dP2PVFf80rkVJmlp3nPnfenBlYdjzSwYG8SNCarcEUzpgU7_IXu5mRCHnB3_ddt-JyIj7CBpo_8-U9b_PyN7O1fmLFe-7R-s1pr3G7glyRYwSGp-QAQvuTiWSJD-VbzSHwEoRupzvpWt_wW30EN8Ij9TXIxzP2g0M";

const waitForTaskCompletion = async (taskId) => {
  while (true) {
    const response = await fetch(
      `https://api.cloudconvert.com/v2/tasks/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
        },
      }
    );

    const taskData = await response.json();
    console.log("Task Status Check:", taskData);

    if (taskData?.data?.status === "finished") {
      return taskData?.data;
    } else if (taskData?.data?.status === "error") {
      throw new Error("Task failed with error.");
    }

    // Wait for 3 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
};

const convertWebMToMP4 = async (webmBlob) => {
  try {
    console.log("Step 1: Requesting import/upload task...");
    downloadLink.innerText = "Converting to MP4..."; // Update the text on the download button

    // Step 1: Request an import/upload task from CloudConvert
    const importResponse = await fetch(
      "https://api.cloudconvert.com/v2/import/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const importData = await importResponse.json();
    console.log("Import Response:", importData);

    if (
      !importData?.data?.result?.form?.url ||
      !importData?.data?.result?.form?.parameters
    ) {
      throw new Error("Failed to retrieve the upload URL or form parameters.");
    }

    const uploadUrl = importData.data.result.form.url;
    const formParameters = importData.data.result.form.parameters;

    console.log("Step 2: Uploading WebM file...");

    // Step 2: Upload the WebM file to the provided URL
    const formData = new FormData();

    // Add all required fields from the form parameters
    for (const [key, value] of Object.entries(formParameters)) {
      formData.append(key, value);
    }

    // Add the WebM file
    formData.append("file", webmBlob, "recording.webm");

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    const uploadResponseBody = await uploadResponse.text();
    console.log("Upload Response Status:", uploadResponse.status);
    console.log("Upload Response Body:", uploadResponseBody);

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload the WebM file to CloudConvert.");
    }

    console.log("File successfully uploaded.");

    console.log("Step 3: Creating conversion job...");

    // Step 3: Create a conversion job with CloudConvert
    const conversionResponse = await fetch(
      "https://api.cloudconvert.com/v2/jobs",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tasks: {
            "convert-my-file": {
              operation: "convert",
              input: importData.data.id, // Reference the import task by ID
              input_format: "webm",
              output_format: "mp4",
            },
            "export-my-file": {
              operation: "export/url",
              input: "convert-my-file", // Reference the convert task
            },
          },
        }),
      }
    );

    const conversionData = await conversionResponse.json();
    console.log("Conversion Response:", conversionData);

    console.log("Step 4: Retrieving export task...");

    // Find the export task
    const exportTask = conversionData?.data?.tasks?.find(
      (task) => task.operation === "export/url"
    );

    if (!exportTask?.id) {
      throw new Error("Export task ID not found in conversion response.");
    }

    // Wait for the export task to complete
    console.log("Waiting for the export task to finish...");
    const completedExportTask = await waitForTaskCompletion(exportTask.id);

    // Retrieve the download URL
    const downloadUrl = completedExportTask?.result?.files?.[0]?.url;
    if (!downloadUrl) {
      throw new Error(
        "Failed to retrieve the download URL for the converted MP4."
      );
    }

    console.log("MP4 File URL:", downloadUrl);
    return downloadUrl;
  } catch (error) {
    console.error("Error converting WebM to MP4:", error.message || error);
    downloadLink.innerText = "Conversion Failed. Try Again.";
    throw error;
  }
};

startBtn.addEventListener("click", async () => {
  try {
    console.log("Starting recording...");

    const canvas = document.querySelector("canvas");
    if (!canvas) {
      throw new Error(
        "Canvas element not found. Please ensure the sketch is running."
      );
    }
    const canvasStream = canvas.captureStream(60);

    const audioContext = getAudioContext();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    const audioDestination = audioContext.createMediaStreamDestination();
    song.connect(audioDestination);
    const audioStream = audioDestination.stream;

    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);

    const options = {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 5000000,
    };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = "video/webm";
    }
    mediaRecorder = new MediaRecorder(combinedStream, options);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const webmBlob = new Blob(recordedChunks, { type: "video/webm" });
      console.log("Recording stopped. Starting conversion...");

      try {
        // Convert WebM to MP4 using CloudConvert
        downloadLink.style.display = "block";
        downloadLink.innerText = "Converting to MP4..."; // Set conversion message
        const mp4Url = await convertWebMToMP4(webmBlob);

        // Set up download link for the converted MP4 file
        downloadLink.href = mp4Url;
        downloadLink.style.display = "block";
        downloadLink.download = "canvas-recording.mp4";
        downloadLink.innerText = "Download MP4 Recording";

        console.log("Conversion successful. MP4 file ready to download.");
      } catch (error) {
        console.error("Error during conversion:", error.message || error);
        alert("Conversion to MP4 failed. Please try again.");
      }

      recordedChunks = [];
    };

    mediaRecorder.start();
    console.log("Recording started.");
    startBtn.disabled = true;
    stopBtn.disabled = false;

    // Automatically stop recording after 10 seconds
    recordingTimeout = setTimeout(() => {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        console.log("Automatically stopping recording after 10 seconds...");
      }
    }, 11000); // 10 seconds
  } catch (err) {
    console.error("Error starting recording:", err.message || err);
    alert(`Error: ${err.message}`);
  }
});

// Stop Recording
stopBtn.addEventListener("click", () => {
  if (recordingTimeout) {
    clearTimeout(recordingTimeout); // Clear the timeout if manually stopped
  }
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    console.log("Stopping recording...");
  }
  startBtn.disabled = false;
  stopBtn.disabled = true;
});
