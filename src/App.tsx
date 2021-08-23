import React, { useRef, useState } from "react";
import styled from "styled-components";
import { useDropzone } from "react-dropzone";
import { useRendering } from "./hooks";

function App() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isSplited, setIsSplited] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const renderingCanvas1 = useRef<HTMLCanvasElement>(null);
  const renderingCanvas2 = useRef<HTMLCanvasElement>(null);

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

  setTimeout(() => {
    setIsPlaying(true);
  }, 10000);

  // redux로 가지고 있어야 하는 전역 데이터
  // canvas 외의 것들을 redux로 관리할 듯
  useRendering(currentFile, renderingCanvas1, isPlaying);
  useRendering(currentFile, renderingCanvas2, isPlaying);

  return (
    <Container {...getRootProps()} isSplited={isSplited}>
      <div className="canvas-wrapper">
        <canvas
          id="renderingCanvas1"
          ref={renderingCanvas1}
          className="renderingCanvas"
        ></canvas>
        {isSplited && (
          <canvas
            id="renderingCanvas2"
            ref={renderingCanvas2}
            className="renderingCanvas"
          ></canvas>
        )}
      </div>
      <div className="editing-div">
        <div className="over-height-placeholder"></div>
      </div>
    </Container>
  );
}

interface ContainerProps {
  isSplited: boolean;
}

const Container = styled.div<ContainerProps>`
  min-width: 1000px;
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-columns: 1fr 500px;

  .canvas-wrapper {
    width: 100%;
    display: flex;
    justify-content: center;

    .renderingCanvas {
      height: 100%;
      width: ${(props) => (props.isSplited ? "50%" : "100%")};
      border: 1px solid black;
    }
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
