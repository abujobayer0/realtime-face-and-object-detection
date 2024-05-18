// import { useRef, useEffect, useState } from "react";
// import ml5 from "ml5";

// const ImageDetection = (props) => {
//   const { imgURL } = props;
//   const imageRef = useRef(null);
//   const objectSvgRef = useRef(null);
//   const [imageSize, setImageSize] = useState({ width: 680, height: 480 });
//   let objectDetector;
//   useEffect(() => {
//     const runDetection = async () => {
//       startImageDetection();
//     };
//     runDetection();
//   }, []);

//   const startImageDetection = async () => {
//     try {
//       const image = new Image();
//       image.src = imgURL;
//       image.onload = () => {
//         setImageSize({ width: image.width, height: image.height });
//         initObjectDetection(image);
//       };
//     } catch (err) {
//       console.error("Error loading image:", err);
//     }
//   };

//   const initObjectDetection = async (image) => {
//     objectDetector = ml5.objectDetector("cocossd", () => {
//       detectObjects(image);
//     });
//   };

//   const detectObjects = (image) => {
//     objectDetector.detect(image, (error, results) => {
//       if (error) {
//         console.error(error);
//         return;
//       }
//       console.log(results, "results");
//       drawObjectDetections(results);
//     });
//   };

//   const drawObjectDetections = (results) => {
//     const container = objectSvgRef.current;
//     container.innerHTML = "";

//     results.forEach((result) => {
//       const { x, y, width, height, label } = result;
//       createDiv(
//         container,
//         (x * imageSize.width) / imageRef.current.width,
//         (y * imageSize.height) / imageRef.current.height,
//         (width * imageSize.width) / imageRef.current.width,
//         (height * imageSize.height) / imageRef.current.height,
//         label,
//         "#fff",
//         "#7513e820",
//         "#7513e8"
//       );
//     });
//   };

//   const createDiv = (
//     container,
//     x,
//     y,
//     width,
//     height,
//     label,
//     textColor,
//     backgroundColor,
//     borderColor
//   ) => {
//     const div = document.createElement("div");
//     div.style.position = "absolute";
//     div.style.left = `${x}px`;
//     div.style.top = `${y}px`;
//     div.style.width = `${width}px`;
//     div.style.height = `${height}px`;
//     div.style.border = `2px solid ${borderColor}`;
//     div.style.backgroundColor = backgroundColor;
//     div.style.color = textColor;
//     div.style.display = "flex";
//     div.style.alignItems = "start";
//     div.style.justifyContent = "start";
//     div.style.fontSize = "14px";
//     div.style.fontWeight = "bold";

//     const p = document.createElement("p");
//     p.textContent = label;
//     p.style.margin = "0";
//     p.style.padding = "5px";
//     p.style.backgroundColor = borderColor;

//     div.appendChild(p);
//     container.appendChild(div);
//   };

//   return (
//     <div style={{ position: "relative" }}>
//       <img
//         style={{ width: "100%" }}
//         ref={imageRef}
//         onLoad={() => {
//           setImageSize({
//             width: imageRef.current.width,
//             height: imageRef.current.height,
//           });
//         }}
//         src={imgURL}
//         alt=""
//       />
//       <div
//         ref={objectSvgRef}
//         style={{
//           borderRadius: "8px",
//           position: "absolute",
//           left: 0,
//           top: 0,
//           width: imageSize.width,
//           height: imageSize.height,
//         }}
//       ></div>
//     </div>
//   );
// };

// export default ImageDetection;
