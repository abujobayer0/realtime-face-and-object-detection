import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const TrainModels = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [trainedFaces, setTrainedFaces] = useState([]);
  const [faceName, setFaceName] = useState("");
  const [videoSize, setVideoSize] = useState({ width: 680, height: 480 });
  const storedFaces = JSON.parse(localStorage.getItem("trainedFaces")) || [];
  const [isVideoReady, setIsVideoReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeModelsAndVideo = async () => {
      await faceapi.tf.setBackend("webgl");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        faceapi.nets.ageGenderNet.loadFromUri("/models"),
      ]);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsVideoReady(true);
        };
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    initializeModelsAndVideo();
  }, []);

  useEffect(() => {
    if (isVideoReady) {
      captureSingleFaceData();
    }
  }, [isVideoReady]);

  const captureSingleFaceData = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const faceDetectionOptions = new faceapi.TinyFaceDetectorOptions();
    const faces = await faceapi
      .detectAllFaces(videoRef.current, faceDetectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withFaceExpressions()
      .withAgeAndGender();
    clearCanvas();
    if (faces.length > 0) {
      const face = faces[0];
      const descriptor = face.descriptor;
      const faceBox = face.detection.box;
      const imageDataUrl = await captureFaceImage(faceBox);
      drawFaceBoxAndLabel(face, "Detected");
      const faceData = {
        name: faceName,
        descriptor,
        image: imageDataUrl,
        id: storedFaces.length + 1,
      };
      saveToLocalStorage(faceData);
      setTrainedFaces((prevTrainedFaces) => [...prevTrainedFaces, faceData]);
    } else {
      faces.forEach((face) => drawFaceBoxAndLabel(face, "Detected"));
    }
  };

  const saveToLocalStorage = (faceData) => {
    if (faceName === "") return;

    const similarFaceIndex = storedFaces.findIndex((storedFace) => {
      if (faceData.descriptor.length !== storedFace.descriptor.length) {
        return false;
      }
      const distance = faceapi.euclideanDistance(
        faceData.descriptor,
        storedFace.descriptor
      );
      return distance < 0.7;
    });

    if (similarFaceIndex !== -1) {
      console.info("same face exists");
      storedFaces[similarFaceIndex] = faceData;
    } else {
      storedFaces.push(faceData);
    }
    localStorage.setItem("trainedFaces", JSON.stringify(storedFaces));
    console.log(faceData);
  };

  const captureFaceImage = async (faceBox) => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = faceBox.width;
    canvas.height = faceBox.height;

    context.drawImage(
      video,
      faceBox.x,
      faceBox.y,
      faceBox.width,
      faceBox.height,
      0,
      0,
      faceBox.width,
      faceBox.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, "image/png");
    });
  };

  const drawFaceBoxAndLabel = (face, label) => {
    const { x, y, width, height } = face.detection.box;
    createSvgRect(x, y, width, height, "#ff4c4c", "#ff4c4c20");
    createSvgText(x + 10, y - 5, label, "#fff", "#ff4c4c");
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    while (canvas.firstChild) {
      canvas.removeChild(canvas.firstChild);
    }
  };

  const createSvgRect = (x, y, width, height, strokeColor, fillColor) => {
    const canvas = canvasRef.current;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x.toString());
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", width.toString());
    rect.setAttribute("height", height.toString());
    rect.setAttribute("stroke", strokeColor);
    rect.setAttribute("fill", fillColor);
    rect.setAttribute("stroke-width", "2");
    canvas.appendChild(rect);
  };

  const createSvgText = (x, y, textContent, textColor, backgroundColor) => {
    const svg = canvasRef.current;

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x.toString());
    text.setAttribute("y", (y - 5).toString());
    text.setAttribute("font-size", "14px");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("fill", textColor);
    text.textContent = textContent;
    svg.appendChild(text);

    const textWidth = text.getBBox().width;

    const backgroundRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    backgroundRect.setAttribute("x", (x - 5).toString());
    backgroundRect.setAttribute("y", (y - 20).toString());
    backgroundRect.setAttribute("width", (textWidth + 10).toString());
    backgroundRect.setAttribute("height", "20");
    backgroundRect.setAttribute("fill", backgroundColor);
    svg.insertBefore(backgroundRect, text);
  };

  const runTraining = async () => {
    if (faceName.trim() === "") {
      alert("Enter face name first");
      return;
    }

    await captureSingleFaceData();
    navigate("/");
  };

  const sendDataToServer = async () => {
    try {
      const response = await axios.post("http://localhost:3000/train/face", {
        trainedFaces,
      });
      console.log(response.data);
    } catch (error) {
      console.error("Error sending data to server:", error);
    }
  };

  const redirectPage = () => {
    navigate("/");
  };

  return (
    <div
      style={{
        marginTop: 10,
        width: "100%",
        borderRadius: "8px",
        border: "1px dashed",
        padding: 10,
      }}
    >
      <button
        onClick={redirectPage}
        style={{
          width: 200,
          height: 40,
          position: "absolute",
          top: 40,
          left: 20,
          border: "1px dashed #58a6ff",
          color: "#58a6ff",
          background: "transparent",
          fontSize: 15,
          fontWeight: "bold",
          borderRadius: "8px",
          zIndex: 10,
          cursor: "pointer",
        }}
      >
        Go Back
      </button>
      <h1 style={{ color: "#58a6ff", textAlign: "center" }}>Face Training</h1>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          id="faceName"
          style={{
            width: 200,
            padding: 10,
            border: "1px dashed",
            borderRadius: "8px",
          }}
          placeholder="Enter Face Name"
          value={faceName}
          onChange={(e) => setFaceName(e.target.value)}
        />
        {trainedFaces.length < 5 ? (
          <button
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              fontSize: "16px",
              cursor: "pointer",
              border: "1px dashed",
              borderRadius: "8px",
            }}
            onClick={runTraining}
          >
            {"Start Training"}
          </button>
        ) : (
          <button
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              fontSize: "16px",
              cursor: "pointer",
              border: "1px dashed",
              borderRadius: "8px",
              background: "#58a6ff",
            }}
            onClick={sendDataToServer}
          >
            Send Data to Server
          </button>
        )}
      </div>
      <div
        style={{ position: "relative", marginTop: 13, width: videoSize.width }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          id="video"
          onLoadedMetadata={() => {
            const videoWidth = videoRef.current.clientWidth;
            const videoHeight = videoRef.current.clientHeight;
            setVideoSize({ width: videoWidth, height: videoHeight });
          }}
          style={{
            border: "1px dashed #58a6ff",
            borderRadius: "8px",
            objectFit: "contain",
          }}
        ></video>
        <svg
          ref={canvasRef}
          width={videoSize.width}
          height={videoSize.height}
          style={{ position: "absolute", left: 0, top: 0 }}
        ></svg>
      </div>
    </div>
  );
};

export default TrainModels;
