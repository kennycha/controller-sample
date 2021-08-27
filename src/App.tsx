import React, { useEffect, useRef, useState } from "react";
import * as BABYLON from "@babylonjs/core";
import styled from "styled-components";
import { useDropzone } from "react-dropzone";
import { useDispatch } from "react-redux";
import { useRendering } from "./hooks";
import { useSelector } from "./reducers";
import { updateModelAssets } from "./actions/modelAssets";
import { roundQuaternion, roundVector3 } from "./utils";

const TARGET_BONE_NAMES = [
  "mixamorig:Hips",
  "mixamorig:LeftUpLeg",
  "mixamorig:RightUpLeg",
  "mixamorig:Spine",
  "mixamorig:LeftLeg",
  "mixamorig:RightLeg",
  "mixamorig:Spine1",
  "mixamorig:LeftFoot",
  "mixamorig:RightFoot",
  "mixamorig:Spine2",
  "mixamorig:LeftToeBase",
  "mixamorig:RightToeBase",
  "mixamorig:Neck",
  "mixamorig:LeftShoulder",
  "mixamorig:RightShoulder",
  "mixamorig:Head",
  "mixamorig:LeftArm",
  "mixamorig:RightArm",
  "mixamorig:LeftForeArm",
  "mixamorig:RightForeArm",
  "mixamorig:LeftHand",
  "mixamorig:RightHand",
  "mixamorig:LeftHandIndex1",
  "mixamorig:RightHandIndex1",
];

function App() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isSplited, setIsSplited] = useState<boolean>(false);
  const [
    currentAnimationGroup,
    setCurrentAnimationGroup,
  ] = useState<BABYLON.AnimationGroup | null>(null);
  const [currentGizmoTarget, setCurrentGizmoTarget] = useState<
    BABYLON.TransformNode | BABYLON.Mesh | null
  >(null);

  const renderingCanvas1 = useRef<HTMLCanvasElement>(null);
  const renderingCanvas2 = useRef<HTMLCanvasElement>(null);

  const dispatch = useDispatch();
  const modelAssets = useSelector((state) => state.modelAssets);

  useEffect(() => {
    if (currentAnimationGroup) {
      currentAnimationGroup.play();
      // currentAnimationGroup.pause();
      // currentAnimationGroup.goToFrame(0);
    }
  }, [currentAnimationGroup]);

  useEffect(() => {
    console.log("modelAssets: ", modelAssets);
  }, [modelAssets]);

  setTimeout(() => {
    if (
      modelAssets[0] &&
      modelAssets[0].skeleton &&
      modelAssets[0].controllers.length > 0
    ) {
      modelAssets[0].controllers.forEach((controller, idx) => {
        const targetBone = modelAssets[0].skeleton.bones.find(
          (bone) => bone.uniqueId === parseInt(controller.state)
        );

        console.log("controller name: ", controller.name);
        console.log(
          "controller local position: ",
          roundVector3(controller.position, 4)
        );
        console.log(
          "controller absolute position: ",
          roundVector3(controller.absolutePosition, 4)
        );
        console.log(
          "controller absolute rotationQuaternion: ",
          roundQuaternion(controller.absoluteRotationQuaternion, 4)
        );
        console.log(
          "controller local scale: ",
          roundVector3(controller.scaling, 4)
        );
        console.log(
          "controller absolute scale: ",
          roundVector3(controller.absoluteScaling, 4)
        );
        if (targetBone) {
          console.log("targetBone name: ", targetBone.name);
          console.log(
            "targetBone local position: ",
            roundVector3(targetBone.position, 4)
          );
          console.log(
            "targetBone absolute position: ",
            roundVector3(targetBone.getAbsolutePosition(), 4)
          );
          console.log(
            "targetBone world rotationQuaternion: ",
            roundQuaternion(
              targetBone.getRotationQuaternion(BABYLON.Space.WORLD),
              2
            )
          );
          console.log(
            "targetBone local scale: ",
            roundVector3(targetBone.getScale(), 4)
          );
        }
      });
    }
  }, 10000);

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

  const handleAddAssets = () => {
    if (modelAssets[0]) {
      const { animationGroups, meshes, skeleton } = modelAssets[0];
      if (animationGroups && meshes && skeleton) {
        const scene = skeleton.getScene();
        animationGroups.forEach((animationGroup) => {
          animationGroup.pause();
          animationGroup.goToFrame(0);
        });
        meshes.forEach((mesh) => {
          mesh.isPickable = false;
          scene.addMesh(mesh);
        });
        scene.addSkeleton(modelAssets[0].skeleton);
        skeleton.bones.forEach((bone) => {
          if (!bone.name.toLowerCase().includes("scene")) {
            const jointSphere = BABYLON.MeshBuilder.CreateSphere(
              "jointSphere",
              { diameter: 3 },
              scene
            );
            jointSphere.renderingGroupId = 3;
            jointSphere.attachToBone(bone, meshes[0]);

            // manage joint sphere actions
            jointSphere.actionManager = new BABYLON.ActionManager(scene);
            jointSphere.actionManager.registerAction(
              new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPickDownTrigger,
                (event) => {
                  setCurrentGizmoTarget(bone.getTransformNode());
                }
              )
            );
            jointSphere.actionManager.registerAction(
              new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOverTrigger,
                () => {
                  scene.hoverCursor = "pointer";
                }
              )
            );
            jointSphere.actionManager.registerAction(
              new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOutTrigger,
                () => {
                  scene.hoverCursor = "default";
                }
              )
            );
          }
        });
        modelAssets[0].transformNodes.forEach((transformNode) => {
          transformNode.getScene().addTransformNode(transformNode);
        });
      }
    }
  };

  const handleAddControllers = () => {
    const {
      animationGroups,
      meshes,
      skeleton,
      transformNodes,
      controllers,
    } = modelAssets[0];
    if (controllers.length > 0) {
      return;
    }
    if (animationGroups && meshes && skeleton && transformNodes) {
      const newAnimationGroup = new BABYLON.AnimationGroup(
        animationGroups[0].name,
        meshes[0].getScene()
      );
      animationGroups[0].targetedAnimations.forEach((targetedAnimation) => {
        newAnimationGroup.addTargetedAnimation(
          targetedAnimation.animation,
          targetedAnimation.target
        );
      });
      const controllers: BABYLON.Mesh[] = [];
      skeleton.bones.forEach((bone, idx) => {
        if (TARGET_BONE_NAMES.includes(bone.name)) {
          const controller = BABYLON.MeshBuilder.CreateTorus(
            `${bone.name}_Ctrl`,
            { diameter: 0.3, thickness: 0.01 },
            bone.getScene()
          );
          controller.setAbsolutePosition(bone.getAbsolutePosition());
          controller.renderingGroupId = 3;
          controller.state = bone.uniqueId.toString();

          const newPositionAnimation = new BABYLON.Animation(
            `${controller.name}_position`,
            "position",
            1,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );
          const newRotationQuaternionAnimation = new BABYLON.Animation(
            `${controller.name}_rotationQuaternon`,
            "rotationQuaternion",
            1,
            BABYLON.Animation.ANIMATIONTYPE_QUATERNION,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );
          const newScaleAnimation = new BABYLON.Animation(
            `${controller.name}_scaling`,
            "scaling",
            1,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );
          controller.actionManager = new BABYLON.ActionManager(
            skeleton.getScene()
          );
          controller.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
              BABYLON.ActionManager.OnPickDownTrigger,
              (event) => {
                setCurrentGizmoTarget(controller);
              }
            )
          );
          controller.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
              BABYLON.ActionManager.OnPointerOverTrigger,
              () => {
                const scene = skeleton.getScene();
                scene.hoverCursor = "pointer";
              }
            )
          );
          controller.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
              BABYLON.ActionManager.OnPointerOutTrigger,
              () => {
                const scene = skeleton.getScene();
                scene.hoverCursor = "default";
              }
            )
          );

          const transformNode = bone.getTransformNode();
          if (transformNode) {
            const [
              positionAnimation,
              rotationQuaternionAnimation,
              scaleAnimation,
            ] = transformNode.animations;
            if (controllers.length === 0) {
              // 아래 local들을 world로 바꿔서 controller의 local에 넣으면 될 듯?
              const originalPositionKeys = positionAnimation.getKeys();
              const originalRotationQuaternionKeys = rotationQuaternionAnimation.getKeys();
              console.log("originalPositionKeys: ", originalPositionKeys);
              console.log(
                "originalRotationQuaternionKeys: ",
                originalRotationQuaternionKeys
              );
              // const firstRotationQuaternion: BABYLON.Quaternion = originalRotationQuaternionKeys[0].value
              //   .clone()
              //   .normalize();
              // const firstRotation = firstRotationQuaternion.toEulerAngles();

              // console.log(
              //   "firstRotationQuaternion: ",
              //   roundQuaternion(firstRotationQuaternion, 4)
              // );
              // console.log("firstRotation: ", roundVector3(firstRotation, 4));

              const parentBone = bone.getParent();
              if (parentBone) {
                // const parentController = controllers.find((ctrl) => ctrl.state === parentBone.uniqueId.toString())
                const parentWorldMatrix = parentBone.getWorldMatrix().clone();
                const newPositionKeys = originalPositionKeys.map((key) => ({
                  ...key,
                  value: BABYLON.Vector3.TransformCoordinates(
                    key.value,
                    parentWorldMatrix
                  ),
                }));

                // const newRotation = firstRotation.add(
                //   parentBone.getRotation(BABYLON.Space.WORLD)
                // );
                // const newRotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
                //   newRotation.x,
                //   newRotation.y,
                //   newRotation.z
                // );
                // console.log(
                //   "newRotationQuaternion: ",
                //   roundQuaternion(newRotationQuaternion, 4)
                // );
                // console.log("newRotation: ", roundVector3(newRotation, 4));

                // 에러 방지용 임시코드
                newPositionAnimation.setKeys(newPositionKeys);
                newRotationQuaternionAnimation.setKeys(
                  originalRotationQuaternionKeys
                );
              } else {
                // 에러 방지용 임시코드
                newPositionAnimation.setKeys(originalPositionKeys);
                newRotationQuaternionAnimation.setKeys(
                  originalRotationQuaternionKeys
                );
              }
            } else {
              newPositionAnimation.setKeys(positionAnimation.getKeys());
              newRotationQuaternionAnimation.setKeys(
                rotationQuaternionAnimation.getKeys()
              );
            }
            newScaleAnimation.setKeys(scaleAnimation.getKeys());
          } else {
            newPositionAnimation.setKeys([]);
            newRotationQuaternionAnimation.setKeys([]);
            newScaleAnimation.setKeys([]);
          }
          controller.animations = [
            newPositionAnimation,
            newRotationQuaternionAnimation,
            newScaleAnimation,
          ];
          newAnimationGroup.addTargetedAnimation(
            newPositionAnimation,
            controller
          );
          newAnimationGroup.addTargetedAnimation(
            newRotationQuaternionAnimation,
            controller
          );
          newAnimationGroup.addTargetedAnimation(newScaleAnimation, controller);
          controllers.push(controller);
        }
      });
      if (currentAnimationGroup) {
        currentAnimationGroup.stop();
      }
      setCurrentAnimationGroup(newAnimationGroup);
      controllers.forEach((controller, idx) => {
        const { state } = controller;
        const targetBone = skeleton.bones.find(
          (bone) => bone.uniqueId === parseInt(state)
        );
        if (targetBone) {
          if (targetBone.children.length > 0) {
            targetBone.children.forEach((child) => {
              const childController = controllers.find(
                (ctrl) => ctrl.state === child.uniqueId.toString()
              );
              if (childController) {
                childController.setParent(controller);
              }
            });
          }
        }
      });
      const updatedContainer = {
        ...{ ...modelAssets[0], animationGroups: [newAnimationGroup] },
        controllers,
      };
      dispatch(updateModelAssets({ id: modelAssets[0].id, updatedContainer }));
    }
  };

  const { getRootProps } = useDropzone({
    onDrop: handleDrop,
  });

  // redux로 가지고 있어야 하는 전역 데이터
  // canvas 외의 것들을 redux로 관리할 듯
  useRendering(
    currentFile,
    renderingCanvas1,
    currentGizmoTarget,
    setCurrentGizmoTarget
  );
  // useRendering(currentFile, renderingCanvas2);

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
          <button className="editing-button" onClick={handleToggleSplit}>
            Toggle Split
          </button>
          <button className="editing-button" onClick={handleAddAssets}>
            Add Assets
          </button>
          <button className="editing-button" onClick={handleAddControllers}>
            Add Controllers
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

      .editing-button {
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
