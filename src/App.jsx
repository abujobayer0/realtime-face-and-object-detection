import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as faceapi from "face-api.js";
import ml5 from "ml5";
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
// import ImageDetection from "./components/imgDetection";

const FaceDetection = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const objectSvgRef = useRef(null);
  const containerRef = useRef(null);
  const faceRef = useRef(null);
  const storedFaces = JSON.parse(localStorage.getItem("trainedFaces")) || [];
  const [objectCounts, setObjectCounts] = useState({});
  const [videoSize, setVideoSize] = useState({ width: 680, height: 480 });
  const [clearFaces, setClearFaces] = useState([]);
  let objectDetector;
  // const imageLinks = [
  //   "http://195.32.24.180:1024/mjpg/video.mjpg",
  //   "http://193.214.75.118/mjpg/video.mjpg",
  //   "http://185.133.99.214:8010/mjpg/video.mjpg",
  //   "http://100.42.92.26/mjpg/video.mjpg",
  //   "http://77.222.181.11:8080/mjpg/video.mjpg",
  //   "http://80.14.201.251:8010/mjpg/video.mjpg",
  //   "",
  // ];
  useEffect(() => {
    const runDetection = async () => {
      await loadModels();
      startVideo();
    };

    runDetection();
  }, []);

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      console.log(videoRef);
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

  return (
    <div
      style={{
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
      <button
        onClick={redirectPage}
        style={{
          width: 200,
          height: 40,
          position: "absolute",
          top: 40,
          right: 20,
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
        Train Faces
      </button>
      <h1
        style={{
          padding: "25px",
          width: "100%",
          marginTop: 0,
          color: "#58a6ff",
        }}
      >
        Face Detection & Object Detection
      </h1>
      <div className="responsive-container">
        <div ref={containerRef} style={{ position: "relative" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            id="video"
            style={{
              border: "1px dashed #58a6ff",
              borderRadius: "8px",
              objectFit: "contain",
            }}
            onLoadedMetadata={() => {
              const videoWidth = videoRef.current.clientWidth;
              const videoHeight = videoRef.current.clientHeight;
              setVideoSize({ width: videoWidth, height: videoHeight });
            }}
          ></video>
          <div
            ref={objectSvgRef}
            style={{
              borderRadius: "8px",
              position: "absolute",
              left: 0,
              top: 0,
            }}
            width={videoSize.width}
            height={videoSize.height}
          ></div>
          <div
            style={{
              borderRadius: "8px",
              position: "absolute",
              left: 0,
              top: 0,
            }}
            ref={faceRef}
            width={videoSize.width}
            height={videoSize.height}
          ></div>
        </div>
        <div
          style={{
            border: "1px dashed #58a6ff",
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            justifyContent: "center",
            minHeight: 458,
            backgroundColor: "#0d1117",
          }}
        >
          <h1 style={{ padding: "10px", color: "#58a6ff" }}>
            Object Detection Results
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {Object.entries(objectCounts).map(([label, count], index) => (
              <div
                key={index}
                style={{
                  marginRight: "20px",
                  marginBottom: "20px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    padding: "10px",
                    border: "1px dashed #58a6ff",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: "8px",
                    backgroundColor: "#21262d",
                  }}
                >
                  <p
                    style={{ fontSize: "16px" }}
                  >{`Detected ${label}: ${count}`}</p>
                </div>
              </div>
            ))}
            {clearFaces.map((face, index) => (
              <div
                key={index}
                style={{
                  marginRight: "20px",
                  marginBottom: "20px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    padding: "10px",
                    border: "1px dashed #58a6ff",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: "8px",
                    backgroundColor: "#21262d",
                  }}
                >
                  <p
                    style={{ fontSize: "16px" }}
                  >{`name: ${"unknown"} || age: ${parseInt(
                    face.age
                  )} || gender: ${face.gender}`}</p>
                </div>
              </div>
            ))}
            <div
              style={{
                marginRight: "20px",
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  padding: "10px",
                  border: "1px dashed #58a6ff",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "8px",
                  backgroundColor: "#21262d",
                }}
              >
                <p
                  style={{ fontSize: "16px" }}
                >{`Detected Face: ${clearFaces.length}`}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <section
        style={{ display: "flex", width: "100%", gap: 10, minHeight: 480 }}
      >
        <div
          style={{
            border: "1px dashed #58a6ff",
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            justifyContent: "center",
            marginTop: "10px",
            backgroundColor: "#0d1117",
          }}
        >
          <h1 style={{ padding: "10px", color: "#58a6ff" }}>
            Trained Model Preview Zone
          </h1>
          <div
            style={{ display: "flex", flexWrap: "wrap", background: "#0d1117" }}
          >
            {storedFaces.map((trainedFace, index) => (
              <div
                key={index}
                style={{
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
                <div
                  style={{
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
                </div>
                <p style={{ fontSize: "16px", color: "#c9d1d9" }}>
                  {trainedFace.name}
                </p>
                <button
                  style={{
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
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section
        style={{ display: "flex", width: "100%", gap: 10, minHeight: 480 }}
      >
        <div
          style={{
            border: "1px dashed #58a6ff",
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            justifyContent: "center",
            marginTop: "10px",
            backgroundColor: "#0d1117",
          }}
        >
          <h1 style={{ padding: "10px", color: "#58a6ff" }}>
            Live Footages and Realtime Detection
          </h1>
          <div
            style={{
              display: "grid",
              width: "100%",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "20px",
            }}
          >
            {/* {imageLinks.map((img, indx) => (
              <div key={indx}>
                <ImageDetection imgURL={img} />
              </div>
            ))} */}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FaceDetection;
