import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import FaceDetection from "./App.jsx";
import TrainModels from "./components/trainModels/index.jsx";
import RealTimeObjectDetection from "./components/imgDetection/index.jsx";

const RouterMain = () => {
  return (
    <Routes>
      <Route path="/" Component={FaceDetection}></Route>
      <Route path="/train" Component={TrainModels}></Route>
      <Route path="/detection" Component={RealTimeObjectDetection}></Route>
    </Routes>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <RouterMain />
    </BrowserRouter>
  </React.StrictMode>
);
