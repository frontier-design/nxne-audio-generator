// Load YouTube audio
document.getElementById("youtube-load-button").addEventListener("click", () => {
  const youtubeUrl = document.getElementById("youtube-url").value;
  const videoId = extractYouTubeId(youtubeUrl);

  if (videoId) {
    const iframe = document.getElementById("youtube-player");
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`;
    iframe.style.display = "block";

    alert(
      "YouTube audio is now playing! Note: FFT won't work with embedded YouTube audio."
    );
  } else {
    alert("Invalid YouTube URL.");
  }
});

// Helper function to extract video ID from YouTube URL
function extractYouTubeId(url) {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|embed)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
