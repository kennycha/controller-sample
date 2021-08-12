import React, { useRef, useState } from "react";
import styled from "styled-components";
import { useDropzone } from "react-dropzone";
import { useRendering } from "./hooks";

function App() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const renderingCanvas = useRef<HTMLCanvasElement>(null);

  const handleDrop = (files: File[]) => {
    if (files.length > 1) {
      alert("Drop one file at a time.");
    } else if (files.length) {
      const file = files[0];
      setCurrentFile(file);
    }
  };

  const { getRootProps } = useDropzone({
    onDrop: handleDrop,
  });

  useRendering(currentFile, renderingCanvas);

  return (
    <Container {...getRootProps()}>
      <canvas id="renderingCanvas" ref={renderingCanvas}></canvas>
      <div className="editing-div">
        <div className="over-height-placeholder"></div>
      </div>
    </Container>
  );
}

const Container = styled.div`
  min-width: 1000px;
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-columns: 1fr 500px;

  #renderingCanvas {
    height: 100%;
    width: 100%;
    border: 1px solid black;
  }

  .editing-div {
    min-height: 100%;
    width: 100%;
    background-color: blueviolet;
    overflow-y: scroll;

    .over-height-placeholder {
      height: 3000px;
    }
  }
`;

export default App;
