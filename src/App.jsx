import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as faceapi from "face-api.js";
import ml5 from "ml5";
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
import {
  Box,
  Button,
  Typography,
  Grid,
  Paper,
  IconButton,
  Tooltip,
} from "@mui/material";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CameraswitchIcon from "@mui/icons-material/Cameraswitch";
import axios from "axios";

const FaceDetection = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const objectSvgRef = useRef(null);
  const containerRef = useRef(null);
  const faceRef = useRef(null);
  const storedFaces = JSON.parse(localStorage.getItem("trainedFaces")) || [];
  const [objectCounts, setObjectCounts] = useState({});
  const [videoSize, setVideoSize] = useState({ width: null, height: null });
  const [clearFaces, setClearFaces] = useState([]);
  const [restart, setRestart] = useState(false);
  const [isBackCamera, setIsBackCamera] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  let objectDetector;

  useEffect(() => {
    const runDetection = async () => {
      await loadModels();
      startVideo();
    };

    runDetection();
  }, [restart, isBackCamera]);

  const loadModels = async () => {
    await faceapi.tf.setBackend("webgl");
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/models"),
      faceapi.nets.ageGenderNet.loadFromUri("/models"),
    ]);
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: isBackCamera ? { exact: "environment" } : "user" },
      });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        detectFaces();
        initObjectDetection();
      };
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  const initObjectDetection = async () => {
    objectDetector = ml5.objectDetector("cocossd", () => {
      detectObjects();
    });
  };

  const detectObjects = () => {
    objectDetector.detect(videoRef.current, (error, results) => {
      if (error) {
        console.error(error);
        return;
      }

      const counts = results.reduce((acc, result) => {
        acc[result.label] = (acc[result.label] || 0) + 1;
        return acc;
      }, {});

      setObjectCounts(counts);
      drawObjectDetections(results);

      requestAnimationFrame(detectObjects);
    });
  };

  const drawObjectDetections = (results) => {
    const container = objectSvgRef.current;
    container.innerHTML = "";

    results.forEach((result) => {
      const { x, y, width, height, label } = result;
      createDiv(
        container,
        x,
        y,
        width,
        height,
        label,
        "#fff",
        "#7513e820",
        "#7513e8"
      );
    });
  };

  const detectFaces = async () => {
    const faceDetectionOptions = new faceapi.TinyFaceDetectorOptions();
    const faces = await faceapi
      .detectAllFaces(videoRef.current, faceDetectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withFaceExpressions()
      .withAgeAndGender();

    setClearFaces(faces);
    drawFaceDetections(faces);

    requestAnimationFrame(detectFaces);
  };

  const drawFaceDetections = (faces) => {
    const container = faceRef.current;
    container.innerHTML = "";

    faces.forEach((face) => {
      const { x, y, width, height } = face.detection.box;
      const label = getFaceLabel(face);
      createDiv(
        container,
        x,
        y,
        width,
        height,
        label,
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

  const getFaceLabel = (face) => {
    if (!face.descriptor || !face.descriptor.length) {
      console.error("Invalid face descriptor:", face.descriptor);
      return "Unknown";
    }

    const matchingFace = storedFaces.find((trainedFace) => {
      const distance = faceapi.euclideanDistance(
        face.descriptor,
        new Float32Array(Object.values(trainedFace.descriptor))
      );

      return distance < 0.6;
    });

    return matchingFace ? matchingFace.name : "Unknown";
  };

  const redirectPage = () => {
    navigate("/train");
  };

  const removeFaceFromLocalStorageById = (idToRemove) => {
    let storedFaces = JSON.parse(localStorage.getItem("trainedFaces")) || [];

    const indexToRemove = storedFaces.findIndex(
      (face) => face.id === idToRemove
    );

    if (indexToRemove !== -1) {
      const confirmed = window.confirm(
        `Are you sure you want to delete the face with ID ${idToRemove}?`
      );

      if (confirmed) {
        storedFaces.splice(indexToRemove, 1);

        localStorage.setItem("trainedFaces", JSON.stringify(storedFaces));

        console.log(`Face with ID ${idToRemove} removed from localStorage.`);
      } else {
        console.log("Deletion cancelled.");
      }
    } else {
      console.log(`Face with ID ${idToRemove} not found.`);
    }
  };
  useEffect(() => {
    function updateSize() {
      const height = videoRef.current?.clientHeight;
      const width = videoRef.current?.clientWidth;
      if (height && width) {
        setVideoSize({ height: height, width: width });
      }
    }
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }
    console.log(file);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await axios.post(
        "http://localhost:4000/detect",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log("File uploaded successfully", response);
    } catch (error) {
      console.error("Error uploading file", error);
    }
  };

  return (
    <Box
      sx={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0d1117",
        color: "#c9d1d9",
        padding: "20px",
        position: "relative",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Tooltip arrow title={"Train Face"}>
          <IconButton
            onClick={redirectPage}
            sx={{
              border: "1px solid #58a6ff",
            }}
          >
            <ArrowRightAltIcon sx={{ color: "#fff" }} />
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
      <Typography
        variant="h4"
        sx={{
          padding: "25px",
          width: "100%",
          marginTop: 0,
          color: "#58a6ff",
        }}
      >
        Face Detection & Object Detection
      </Typography>
      <Grid
        container
        sx={{
          height: "100%",
          width: "100%",
        }}
      >
        <Grid item xs={12} lg={6} ref={containerRef}>
          <Box
            sx={{
              position: "relative",
              background: "#000000",
              width: videoSize.width,
              height: videoSize.height,
              mx: "auto",
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
              ref={objectSvgRef}
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
            <Box
              ref={faceRef}
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
        </Grid>
        <Grid
          item
          xs={12}
          lg={6}
          sx={{
            border: "1px dashed #58a6ff",
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            justifyContent: "center",
            minHeight: 500,
            backgroundColor: "#0d1117",
            marginTop: "10px",
            height: "100%",
          }}
        >
          <Typography variant="h4" sx={{ padding: "10px", color: "#58a6ff" }}>
            Object Detection Results
          </Typography>
          <Grid container spacing={1}>
            {Object.entries(objectCounts).map(([label, count], index) => (
              <Grid item key={index} xs={12} sm={6} md={4} lg={3}>
                <Box
                  sx={{
                    padding: "10px",
                    border: "1px dashed #58a6ff",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: "8px",
                    backgroundColor: "#21262d",
                    textAlign: "center",
                  }}
                >
                  <Typography sx={{ fontSize: "16px", color: "#fff" }}>
                    {`Detected ${label}: ${count}`}
                  </Typography>
                </Box>
              </Grid>
            ))}
            {clearFaces.map((face, index) => (
              <Grid item key={index} xs={12} sm={6} md={4}>
                <Box
                  sx={{
                    padding: "10px",
                    border: "1px dashed #58a6ff",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: "8px",
                    backgroundColor: "#21262d",
                    textAlign: "center",
                  }}
                >
                  <Typography sx={{ fontSize: "16px", color: "#fff" }}>
                    {`name: ${"unknown"} || age: ${parseInt(
                      face.age
                    )} || gender: ${face.gender}`}
                  </Typography>
                </Box>
              </Grid>
            ))}
            <Grid item xs={12} sm={6} md={4}>
              <Box
                sx={{
                  padding: "10px",
                  border: "1px dashed #58a6ff",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "8px",
                  backgroundColor: "#21262d",
                  textAlign: "center",
                }}
              >
                <Typography sx={{ fontSize: "16px", color: "#fff" }}>
                  {`Detected Face: ${clearFaces.length}`}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Box sx={{ display: "flex", width: "100%", gap: 2, minHeight: 480 }}>
        <Paper
          sx={{
            border: "1px dashed #58a6ff",
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            justifyContent: "center",
            marginTop: "10px",
            backgroundColor: "#0d1117",
          }}
        >
          <Typography variant="h4" sx={{ padding: "10px", color: "#58a6ff" }}>
            Trained Model Preview Zone
          </Typography>
          <Box
            sx={{ display: "flex", flexWrap: "wrap", background: "#0d1117" }}
          >
            {storedFaces.map((trainedFace, index) => (
              <Box
                key={index}
                sx={{
                  marginRight: "20px",
                  marginBottom: "20px",
                  textAlign: "center",
                  border: "1px dashed #58a6ff",
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                  borderBottom: "none",
                  borderBottomRightRadius: "8px",
                  borderBottomLeftRadius: "8px",
                }}
              >
                <Box
                  sx={{
                    padding: "10px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: "8px",
                    backgroundColor: "#21262d",
                  }}
                >
                  <img
                    src={trainedFace.image}
                    alt={trainedFace.name}
                    style={{
                      width: "100px",
                      height: "100px",
                      objectFit: "cover",
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: "16px", color: "#c9d1d9" }}>
                  {trainedFace.name}
                </Typography>
                <Button
                  sx={{
                    background: "#ff4c4c",
                    color: "#fff",
                    padding: "10px 5px",
                    width: "100%",
                    border: "none",
                    borderBottomRightRadius: "8px",
                    borderBottomLeftRadius: "8px",
                    cursor: "pointer",
                  }}
                  onClick={() => removeFaceFromLocalStorageById(trainedFace.id)}
                >
                  Delete
                </Button>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
      <Box sx={{ display: "flex", width: "100%", gap: 2, minHeight: 480 }}>
        <Paper
          sx={{
            border: "1px dashed #58a6ff",
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            justifyContent: "center",
            marginTop: "10px",
            backgroundColor: "#0d1117",
          }}
        >
          <Typography variant="h4" sx={{ padding: "10px", color: "#58a6ff" }}>
            Image upload system
          </Typography>
          <Box
            sx={{
              display: "grid",
              width: "100%",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "20px",
            }}
          >
            {" "}
            <input type="file" onChange={handleFileChange} />
            {preview && <img src={preview} alt="Preview" width="100" />}
            <button onClick={handleUpload}>Upload</button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default FaceDetection;
