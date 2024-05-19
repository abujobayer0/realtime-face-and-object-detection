import { useRef, useEffect, useState } from "react";
import axios from "axios";

const RealTimeObjectDetection = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detections, setDetections] = useState([]);

  useEffect(() => {
    const startVideo = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    };

    startVideo();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      captureFrameAndDetect();
    }, 500);

    return () => clearInterval(intervalId);
  }, []);

  const captureFrameAndDetect = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("image", blob, "frame.jpg");

      try {
        const response = await axios.post(
          "https://ml-server-w7rv.onrender.com/detect",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        console.log(response.data);
        setDetections(response.data);
      } catch (error) {
        console.error("Error detecting objects:", error);
      }
    }, "image/jpeg");
  };

  const drawDetections = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    detections.forEach((detection) => {
      const [x, y, width, height] = detection.bbox;
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      ctx.font = "18px Arial";
      ctx.fillStyle = "red";
      ctx.fillText(
        `${detection.class} (${Math.round(detection.score * 100)}%)`,
        x,
        y > 10 ? y - 5 : 10
      );
    });
  };

  useEffect(() => {
    drawDetections();
  }, [detections]);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <video
        ref={videoRef}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};

export default RealTimeObjectDetection;
