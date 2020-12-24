const webcamVideo = document.querySelector("#webcam");

export function getWebcam() {
  return navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      webcamVideo.srcObject = stream;
      webcamVideo.play();
      document.body.classList.add("webcam-load");

      return webcamVideo;
    });
}
