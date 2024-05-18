import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Box,
  Button,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CameraswitchIcon from "@mui/icons-material/Cameraswitch";
const TrainModels = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [trainedFaces, setTrainedFaces] = useState([]);
  const [faceName, setFaceName] = useState("");
  const [videoSize, setVideoSize] = useState({ width: 680, height: 480 });
  const [restart, setRestart] = useState(false);
  const [isBackCamera, setIsBackCamera] = useState(false);

  const storedFaces = JSON.parse(localStorage.getItem("trainedFaces")) || [];
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
          video: {
            facingMode: isBackCamera ? { exact: "environment" } : "user",
          },
        });
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          captureSingleFaceData();
        };
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    initializeModelsAndVideo();
  }, [restart, isBackCamera]);

  const captureSingleFaceData = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const faceDetectionOptions = new faceapi.TinyFaceDetectorOptions();
    const faces = await faceapi
      .detectAllFaces(videoRef.current, faceDetectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withFaceExpressions()
      .withAgeAndGender();

    if (faces.length > 0) {
      const face = faces[0];
      const descriptor = face.descriptor;
      const faceBox = face.detection.box;
      const imageDataUrl = await captureFaceImage(faceBox);
      drawFaceDetection([face]);
      const faceData = {
        name: faceName,
        descriptor,
        image: imageDataUrl,
        id: storedFaces.length + 1,
      };
      saveToLocalStorage(faceData);
      setTrainedFaces((prevTrainedFaces) => [...prevTrainedFaces, faceData]);
    } else {
      drawFaceDetection(faces);
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

  const drawFaceDetection = (faces) => {
    const container = canvasRef.current;
    container.innerHTML = "";

    faces.forEach((face) => {
      const { x, y, width, height } = face.detection.box;
      createDiv(
        container,
        x,
        y,
        width,
        height,
        "Detected",
        "#fff",
        "#ff4c4c20",
        "#ff4c4c"
      );
    });
  };

  const createDiv = (
    container,
    x,
    y,
    width,
    height,
    label,
    textColor,
    backgroundColor,
    borderColor
  ) => {
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.style.width = `${width}px`;
    div.style.height = `${height}px`;
    div.style.border = `2px solid ${borderColor}`;
    div.style.backgroundColor = backgroundColor;
    div.style.color = textColor;
    div.style.display = "flex";
    div.style.alignItems = "start";
    div.style.justifyContent = "start";
    div.style.fontSize = "14px";
    div.style.fontWeight = "bold";

    const p = document.createElement("p");
    p.textContent = label;
    p.style.margin = "0";
    p.style.padding = "5px";
    p.style.backgroundColor = borderColor;

    div.appendChild(p);
    container.appendChild(div);
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
    <Box
      sx={{
        marginTop: 2,
        width: "100%",
        borderRadius: 2,
        border: "1px dashed",
        padding: 2,
        position: "relative",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Tooltip arrow title={"Go Back"}>
          <IconButton
            onClick={redirectPage}
            sx={{
              border: "1px solid #58a6ff",
            }}
          >
            <ArrowBackIcon sx={{ color: "#fff" }} />
          </IconButton>
        </Tooltip>
        <Tooltip arrow title={"Restart the camera, if not open"}>
          <IconButton
            onClick={() => setRestart((prev) => !prev)}
            sx={{
              border: "1px solid #58a6ff",
            }}
          >
            <RestartAltIcon sx={{ color: "#fff" }} />
          </IconButton>
        </Tooltip>
        <Tooltip arrow title={"Switch Camera"}>
          <IconButton
            onClick={() => setIsBackCamera((prev) => !prev)}
            sx={{
              border: "1px solid #58a6ff",
              display: { xs: "flex", md: "none" },
            }}
          >
            <CameraswitchIcon sx={{ color: "#fff" }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="h4" sx={{ color: "#58a6ff", textAlign: "center" }}>
        Face Training
      </Typography>
      <Box
        sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <TextField
          type="text"
          id="faceName"
          variant="outlined"
          placeholder="Enter Face Name"
          value={faceName}
          onChange={(e) => setFaceName(e.target.value)}
          sx={{
            width: 200,
            padding: 1,
            border: "1px dashed #58a6ff",
            borderRadius: 1,
            marginBottom: 2,
            background: "#fff",
          }}
        />
        {trainedFaces.length < 5 ? (
          <Button
            variant="outlined"
            onClick={runTraining}
            sx={{
              marginTop: 2,
              padding: 1,
              fontSize: 16,
              cursor: "pointer",
              border: "1px dashed",
              borderRadius: 1,
            }}
          >
            Start Training
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={sendDataToServer}
            sx={{
              marginTop: 2,
              padding: 1,
              fontSize: 16,
              cursor: "pointer",
              border: "1px dashed",
              borderRadius: 1,
              background: "#58a6ff",
            }}
          >
            Send Data to Server
          </Button>
        )}
      </Box>
      <Box
        sx={{
          position: "relative",
          marginTop: 2,
          width: videoSize.width,
          height: videoSize.height,
        }}
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
        <Box
          ref={canvasRef}
          sx={{
            borderRadius: "8px",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: videoSize.width,
            height: videoSize.height,
          }}
        ></Box>
      </Box>
    </Box>
  );
};
export default TrainModels;
