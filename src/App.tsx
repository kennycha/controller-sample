import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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

const SKELETON_VIEWER_OPTION = {
  pauseAnimations: false,
  returnToRest: false,
  computeBonesUsingShaders: true,
  useAllBones: true, // error with false
  displayMode: BABYLON.SkeletonViewer.DISPLAY_SPHERE_AND_SPURS,
  displayOptions: {
    sphereBaseSize: 0.01,
    sphereScaleUnit: 15,
    sphereFactor: 0.9,
    midStep: 0.25,
    midStepFactor: 0.05,
  },
};

function App() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isSplited, setIsSplited] = useState<boolean>(false);
  const [
    currentAnimationGroup,
    setCurrentAnimationGroup,
  ] = useState<BABYLON.AnimationGroup | null>(null);
  const [selectedTargets, setSeletedTargets] = useState<
    (BABYLON.Mesh | BABYLON.TransformNode)[]
  >([]);

  const renderingCanvas1 = useRef<HTMLCanvasElement>(null);
  const renderingCanvas2 = useRef<HTMLCanvasElement>(null);

  const dispatch = useDispatch();

  const modelAssets = useSelector((state) => state.modelAssets);

  useEffect(() => {
    console.log("modelAssets: ", modelAssets);
  }, [modelAssets]);

  useEffect(() => {
    console.log("selectedTargets: ", selectedTargets);
  }, [selectedTargets]);

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

        animationGroups.forEach((animationGroup, idx) => {
          // for prevent auto play and go to the first frame
          animationGroup.pause();
          animationGroup.goToFrame(0);

          if (idx === 0) {
            setCurrentAnimationGroup(animationGroup);
          }
        });

        meshes.forEach((mesh) => {
          // make mesh unpickable to pick joint spheres and gizmo
          mesh.isPickable = false;
          scene.addMesh(mesh);
        });

        scene.addSkeleton(modelAssets[0].skeleton);
        // add skeleton viewer
        const skeletonViewer = new BABYLON.SkeletonViewer(
          modelAssets[0].skeleton,
          meshes[0],
          scene,
          true,
          meshes[0].renderingGroupId + 1,
          SKELETON_VIEWER_OPTION
        );
        skeletonViewer.isEnabled = true; // need this line because of the babylon bug

        skeleton.bones.forEach((bone) => {
          if (!bone.name.toLowerCase().includes("scene")) {
            // create joint sphere for each bones
            const jointSphere = BABYLON.MeshBuilder.CreateSphere(
              `jointSphere_${bone.name}`,
              { diameter: 3 },
              scene
            );
            jointSphere.renderingGroupId = 3;
            jointSphere.attachToBone(bone, meshes[0]);

            // manage joint sphere actions
            jointSphere.actionManager = new BABYLON.ActionManager(scene);
            // with clicking joint sphere, its linkedBone's transform will be the current gizmo target, which means the gizmo will be attached to it
            jointSphere.actionManager.registerAction(
              new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPickDownTrigger,
                (event) => {
                  setSeletedTargets([
                    bone.getTransformNode() as BABYLON.TransformNode,
                  ]);
                }
              )
            );
            // pointer cursor with pointer over
            jointSphere.actionManager.registerAction(
              new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOverTrigger,
                () => {
                  scene.hoverCursor = "pointer";
                }
              )
            );
            // default cursor with pointer out
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
          scene.addTransformNode(transformNode);
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

    // have controllers already, then return
    if (controllers.length > 0) {
      return;
    }

    if (animationGroups && meshes && skeleton && transformNodes) {
      // create new animation group which will be set to currentAnimationGroup
      const newAnimationGroup = new BABYLON.AnimationGroup(
        animationGroups[0].name,
        meshes[0].getScene()
      );

      // clone and add targetAnimations that already existed in the origin animationGroup
      animationGroups[0].targetedAnimations.forEach((targetedAnimation) => {
        newAnimationGroup.addTargetedAnimation(
          targetedAnimation.animation,
          targetedAnimation.target
        );
      });

      // array where controllers will be added
      const controllers: BABYLON.Mesh[] = [];

      // create controller for each bones
      skeleton.bones.forEach((bone, idx) => {
        // check if this bone is included in the retargetMap
        if (TARGET_BONE_NAMES.includes(bone.name)) {
          // create controller
          const controller = BABYLON.MeshBuilder.CreateTorus(
            `${bone.name}_Ctrl`,
            { diameter: 30, thickness: 1 },
            bone.getScene()
          );
          // initial position setting
          controller.position = bone.position;
          controller.renderingGroupId = 3;
          // use controller's state for linking it to its corresponding bone
          controller.state = bone.uniqueId.toString();
          const controllerMaterial = new BABYLON.StandardMaterial(
            "controllerMaterial",
            bone.getScene()
          );
          controllerMaterial.diffuseColor = BABYLON.Color3.FromHexString(
            "#52A9FD"
          );
          controller.material = controllerMaterial;

          if (controllers.length === 0) {
            // set Armature bone as the parent of hips contoller -> for sync the overall position, rotation and scale of the model
            controller.setParent(bone.getParent());
          }

          // new animations targeted to the controller
          const controllerPositionAnimation = new BABYLON.Animation(
            `${controller.name}_position`,
            "position",
            1,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );

          const controllerRotationQuaternionAnimation = new BABYLON.Animation(
            `${controller.name}_rotationQuaternon`,
            "rotationQuaternion",
            1,
            BABYLON.Animation.ANIMATIONTYPE_QUATERNION,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );

          const controllerScaleAnimation = new BABYLON.Animation(
            `${controller.name}_scaling`,
            "scaling",
            1,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );

          // manmage controller's action manager
          controller.actionManager = new BABYLON.ActionManager(
            skeleton.getScene()
          );

          // similar actions to the actions of the joint meshes
          controller.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
              BABYLON.ActionManager.OnPickDownTrigger,
              (event) => {
                setSeletedTargets([controller]);
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
              transformNodePositionAnimation,
              transformNodeRotationQuaternionAnimation,
              transformNodeScaleAnimation,
            ] = transformNode.animations;

            // get transformNode animation's keys and set them to the controller animation's keys
            controllerPositionAnimation.setKeys(
              transformNodePositionAnimation.getKeys()
            );
            controllerRotationQuaternionAnimation.setKeys(
              transformNodeRotationQuaternionAnimation.getKeys()
            );
            // }
            controllerScaleAnimation.setKeys(
              transformNodeScaleAnimation.getKeys()
            );
          } else {
            // without transformNode, then use empty keys for controller animation's keys
            controllerPositionAnimation.setKeys([]);
            controllerRotationQuaternionAnimation.setKeys([]);
            controllerScaleAnimation.setKeys([]);
          }

          // push controller animations to controller.animations array
          controller.animations.push(controllerPositionAnimation);
          controller.animations.push(controllerRotationQuaternionAnimation);
          controller.animations.push(controllerScaleAnimation);

          // add targeted animations with controller
          newAnimationGroup.addTargetedAnimation(
            controllerPositionAnimation,
            controller
          );

          newAnimationGroup.addTargetedAnimation(
            controllerRotationQuaternionAnimation,
            controller
          );

          newAnimationGroup.addTargetedAnimation(
            controllerScaleAnimation,
            controller
          );

          // push controller to its summary array
          controllers.push(controller);
        }
      });

      // set the new animatioGroup as the current controlled animationGroup
      setCurrentAnimationGroup(newAnimationGroup);

      // set the hierarchy of controllers as same as the hierarchy of bones
      controllers.forEach((controller, idx) => {
        // maybe change this logic to use scene.getBoneById method
        const { state } = controller;

        const targetBone = skeleton.bones.find(
          (bone) => bone.uniqueId === parseInt(state)
        );

        if (targetBone) {
          if (targetBone.children.length > 0) {
            targetBone.children.forEach((childBone) => {
              const childController = controllers.find(
                (ctrl) => ctrl.state === childBone.uniqueId.toString()
              );
              if (childController) {
                childController.setParent(controller);
              }
            });
          }
        }
      });

      // for update properties after setting the hierarchy
      newAnimationGroup.play();
      newAnimationGroup.pause();
      newAnimationGroup.goToFrame(0);

      // update modelAssets with new animationGroup and controllers
      const updatedContainer = {
        ...{ ...modelAssets[0], animationGroups: [newAnimationGroup] },
        controllers,
      };

      dispatch(updateModelAssets({ id: modelAssets[0].id, updatedContainer }));
    }
  };

  const handlePlayAnimationGroup = useCallback(() => {
    if (currentAnimationGroup && !currentAnimationGroup.isPlaying) {
      if (currentAnimationGroup.isStarted) {
        currentAnimationGroup.restart();
      } else {
        currentAnimationGroup.start();
      }
    }
  }, [currentAnimationGroup]);

  const handlePauseAnimationGroup = useCallback(() => {
    if (currentAnimationGroup) {
      currentAnimationGroup.pause();
    }
  }, [currentAnimationGroup]);

  const handleStopAnimationGroup = useCallback(() => {
    if (currentAnimationGroup) {
      currentAnimationGroup.pause();
      currentAnimationGroup.goToFrame(0);
    }
  }, [currentAnimationGroup]);

  // will delete lines below, only for the debugging
  const handleLogData = () => {
    if (
      modelAssets[0] &&
      modelAssets[0].skeleton &&
      modelAssets[0].controllers.length > 0
    ) {
      modelAssets[0].controllers.forEach((controller, idx) => {
        if (idx < 5) {
          const targetBone = modelAssets[0].skeleton.bones.find(
            (bone) => bone.uniqueId === parseInt(controller.state)
          );
          console.log("------------------------------------------");
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
          // console.log(
          //   "controller local scale: ",
          //   roundVector3(controller.scaling, 4)
          // );
          // console.log(
          //   "controller absolute scale: ",
          //   roundVector3(controller.absoluteScaling, 4)
          // );
          if (targetBone) {
            console.log("------------------------------------------");
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
            // console.log(
            //   "targetBone local scale: ",
            //   roundVector3(targetBone.getScale(), 4)
            // );
            const parentController = controller.parent;
            const parentBone = targetBone.getParent();
            console.log("------------------------------------------");
            console.log("parentController: ", parentController);
            console.log("parentBone: ", parentBone);
            if (parentController && parentBone) {
              console.log(
                "parentController matrix: ",
                parentController.getWorldMatrix()
              );
              console.log("parentBone matrix: ", parentBone.getWorldMatrix());
            }
          }
        }
      });
    }
  };

  const handleGoToFrame = (event: ChangeEvent<HTMLInputElement>) => {
    if (currentAnimationGroup && event.target.value.length) {
      currentAnimationGroup.goToFrame(parseFloat(event.target.value));
    }
  };

  const handleSelectTargets = useCallback(() => {
    setSeletedTargets([]);
  }, []);

  const handleLogSelectedTarget = useCallback(() => {
    console.log("selectedTargets: ", selectedTargets);
  }, [selectedTargets]);

  const { getRootProps } = useDropzone({
    onDrop: handleDrop,
  });

  // redux로 가지고 있어야 하는 전역 데이터
  // canvas 외의 것들을 redux로 관리할 듯
  useRendering(
    currentFile,
    renderingCanvas1,
    selectedTargets,
    setSeletedTargets
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
          <button className="editing-button" onClick={handleLogData}>
            Log Data
          </button>
          <button className="editing-button" onClick={handlePlayAnimationGroup}>
            Play AnimationGroup
          </button>
          <button
            className="editing-button"
            onClick={handlePauseAnimationGroup}
          >
            Pause AnimationGroup
          </button>
          <button className="editing-button" onClick={handleStopAnimationGroup}>
            Stop AnimationGroup
          </button>
          <button className="editing-button" onClick={handleSelectTargets}>
            Select Targets
          </button>
          <button className="editing-button" onClick={handleLogSelectedTarget}>
            Log Selected Targets
          </button>
          <input
            type="number"
            className="editing-input"
            placeholder="go to frame"
            onChange={handleGoToFrame}
          />
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

      .editing-input {
        width: 100%;
        height: 24px;
        font-size: 14px;
        padding-left: 5px;
      }
    }
  }
`;

export default App;
