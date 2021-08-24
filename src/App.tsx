import React, { useRef, useState } from "react";
import styled from "styled-components";
import { useDropzone } from "react-dropzone";
import { useRendering } from "./hooks";

function App() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isSplited, setIsSplited] = useState<boolean>(true);

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

  const handleToggleSplit = () => {
    setIsSplited((prev) => !prev);
  };

  const { getRootProps } = useDropzone({
    onDrop: handleDrop,
  });

  // redux로 가지고 있어야 하는 전역 데이터
  // canvas 외의 것들을 redux로 관리할 듯
  useRendering(currentFile, renderingCanvas1);
  useRendering(currentFile, renderingCanvas2);

  return (
    <Container isSplited={isSplited}>
      <div className="canvas-wrapper">
        <canvas
          id="renderingCanvas1"
          ref={renderingCanvas1}
          className="renderingCanvas"
        ></canvas>
        <canvas
          id="renderingCanvas2"
          ref={renderingCanvas2}
          className="renderingCanvas"
        ></canvas>
      </div>
      <div className="div-wrapper">
        <div {...getRootProps()} className="droping-div">
          Drop File Here
        </div>
        <div className="editing-div">
          <button className="toggle-split" onClick={handleToggleSplit}>
            Toggle Split
          </button>
        </div>
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
    height: 100%;
    display: flex;
    justify-content: center;

    .renderingCanvas {
      height: 100vh;
      border: 1px solid black;
    }

    #renderingCanvas1 {
      width: ${(props) => (props.isSplited ? "50%" : "100%")};
    }

    #renderingCanvas2 {
      width: ${(props) => (props.isSplited ? "50%" : "0%")};
    }
  }

  .div-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: scroll;

    .droping-div {
      font-size: 24px;
      width: 100%;
      height: 30%;
      background-color: yellowgreen;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .editing-div {
      width: 100%;
      height: 70%;
      max-height: 70%;
      background-color: blueviolet;

      .toggle-split {
        width: 100%;
        height: 24px;
        font-size: 14px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }
  }
`;

export default App;
