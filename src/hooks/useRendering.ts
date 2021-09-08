import { RefObject, useEffect, useState } from "react";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import {
  addOutlineToMesh,
  convertFbxToGlb,
  getFileExtension,
  removeOutlineFromMesh,
} from "../utils";
import { loadModelAssets } from "../actions/modelAssets";
import { useSelector } from "../reducers";
import { ShootArcRotateCameraPointersInput } from "../utils/customCameraInputs/ShootArcRotateCameraPointersInput";

const OUTLINE_COLOR = BABYLON.Color3.Red();
const OUTLINE_WIDTH = 0.3;

const useRendering = (
  currentFile: File | null,
  renderingCanvas: RefObject<HTMLCanvasElement>,
  selectedTargets: (BABYLON.TransformNode | BABYLON.Mesh)[],
  setSelectedTargets: React.Dispatch<
    React.SetStateAction<(BABYLON.Mesh | BABYLON.TransformNode)[]>
  >
) => {
  const [scene, setScene] = useState<BABYLON.Scene | null>(null);
  const [gizmoManger, setGizmoManager] = useState<BABYLON.GizmoManager | null>(
    null
  );
  const [currentGizmoMode, setCurrentGizmoMode] = useState<
    "position" | "rotation" | "scale"
  >("position");

  const dispatch = useDispatch();

  const modelAssets = useSelector((state) => state.modelAssets);

  // initial setting
  useEffect(() => {
    const handleSceneReady = (scene: BABYLON.Scene) => {
      if (renderingCanvas.current) {
        if (renderingCanvas.current.id === "renderingCanvas1") {
          BABYLON.Mesh.CreateGround("ground", 5, 5, 5, scene);
        } else if (renderingCanvas.current.id === "renderingCanvas2") {
          scene.forceWireframe = true;
        }

        // create arcRotate camera
        const arcRotateCamera = new BABYLON.ArcRotateCamera(
          "arcRotateCamera",
          0,
          0,
          3,
          BABYLON.Vector3.Zero(),
          scene
        );
        arcRotateCamera.setPosition(new BABYLON.Vector3(0, 3, 5));
        arcRotateCamera.attachControl(renderingCanvas.current, false);
        arcRotateCamera.allowUpsideDown = false;
        arcRotateCamera.minZ = 0.1;
        arcRotateCamera.inertia = 0.5;
        arcRotateCamera.wheelPrecision = 50;
        arcRotateCamera.wheelDeltaPercentage = 0.01;
        arcRotateCamera.lowerRadiusLimit = 0.1;
        arcRotateCamera.upperRadiusLimit = 20;
        arcRotateCamera.panningAxis = new BABYLON.Vector3(1, 1, 0);
        arcRotateCamera.pinchPrecision = 50;
        arcRotateCamera.panningInertia = 0.5;
        arcRotateCamera.panningDistanceLimit = 20;

        arcRotateCamera.inputs.remove(arcRotateCamera.inputs.attached.pointers);
        arcRotateCamera.inputs.add(new ShootArcRotateCameraPointersInput());
        arcRotateCamera._panningMouseButton = 1; // use middle button for panning

        // create hemispheric light
        const hemisphericLight = new BABYLON.HemisphericLight(
          "hemisphericLight",
          new BABYLON.Vector3(0, 1, 0),
          scene
        );
        hemisphericLight.intensity = 0.7;

        // create gizmoManager
        const innerGizmoManager = new BABYLON.GizmoManager(scene);
        setGizmoManager(innerGizmoManager);
        innerGizmoManager.usePointerToAttachGizmos = false;
        innerGizmoManager.positionGizmoEnabled = true; // set default mode as position

        // set gizmoManager observables
        innerGizmoManager.onAttachedToMeshObservable.add((mesh) => {});
        innerGizmoManager.onAttachedToNodeObservable.add((transformNode) => {});
      }
    };

    if (renderingCanvas.current) {
      // use matrices interpolation for animations
      BABYLON.Animation.AllowMatricesInterpolation = true;

      // create engine
      const engine = new BABYLON.Engine(renderingCanvas.current, true);

      // create scene
      const innerScene = new BABYLON.Scene(engine);
      innerScene.useRightHandedSystem = true;

      // set scene actionManager
      innerScene.actionManager = new BABYLON.ActionManager(innerScene);

      // innerScene.onPointerObservable.add((pointerInfo, eventState) => {
      //   if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
      //     if (pointerInfo.pickInfo) {
      //       const { event, pickInfo } = pointerInfo;
      //       console.log("pointerEvent: ", event);
      //       console.log("pickedPoint: ", pickInfo);
      //     }
      //   } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
      //     if (pointerInfo.pickInfo) {
      //       const { event, pickInfo } = pointerInfo;
      //       console.log("pointerEvent: ", event);
      //       console.log("pickedPoint: ", pickInfo);
      //     }
      //   }
      // });

      // set scene observable
      innerScene.onReadyObservable.addOnce((scene) => {
        handleSceneReady(scene);
        setScene(scene);
      });
      innerScene.onDisposeObservable.addOnce((scene) => {
        // reload window on scene dispose event
        window.location.reload();
      });

      // set render loop
      engine.runRenderLoop(() => {
        innerScene.render();
      });

      return () => {
        engine.dispose();
      };
    }
  }, [renderingCanvas]);

  // when gizmo target or mode changed
  useEffect(() => {
    // when the only target is selected
    if (gizmoManger && selectedTargets.length === 1) {
      const currentGizmoTarget = selectedTargets[0];
      // attach gizmo
      if (currentGizmoTarget.getClassName() === "TransformNode") {
        if (gizmoManger.positionGizmoEnabled) {
        } else if (gizmoManger.rotationGizmoEnabled) {
        } else if (gizmoManger.scaleGizmoEnabled) {
        } else {
          switch (currentGizmoMode) {
            case "position": {
              gizmoManger.positionGizmoEnabled = true;
              break;
            }
            case "rotation": {
              gizmoManger.rotationGizmoEnabled = true;
              break;
            }
            case "scale": {
              gizmoManger.scaleGizmoEnabled = true;
              break;
            }
            default: {
              break;
            }
          }
        }
        gizmoManger.attachToNode(currentGizmoTarget);

        const jointSphere = currentGizmoTarget
          .getScene()
          .getMeshByName(`jointSphere_${currentGizmoTarget.name}`);

        addOutlineToMesh(
          jointSphere as BABYLON.Mesh,
          OUTLINE_COLOR,
          OUTLINE_WIDTH
        );

        return () => {
          removeOutlineFromMesh(jointSphere as BABYLON.Mesh);
        };
      } else if (currentGizmoTarget.getClassName() === "Mesh") {
        // case gizmo attached to controller
        // apply delta to linked bone
        gizmoManger.attachToMesh(currentGizmoTarget as BABYLON.Mesh);

        addOutlineToMesh(
          currentGizmoTarget as BABYLON.Mesh,
          OUTLINE_COLOR,
          OUTLINE_WIDTH
        );

        if (modelAssets && modelAssets.length > 0) {
          const linkedBone = modelAssets[0].skeleton.bones.find(
            (bone) => bone.uniqueId === parseInt(currentGizmoTarget.state)
          );
          if (linkedBone) {
            const linkedTransformNode = linkedBone.getTransformNode();
            if (linkedTransformNode) {
              if (
                gizmoManger.positionGizmoEnabled &&
                currentGizmoMode === "position"
              ) {
                const xPositionObservable = gizmoManger.gizmos.positionGizmo!.xGizmo.dragBehavior.onDragObservable.add(
                  ({ delta }) => {
                    linkedTransformNode.setAbsolutePosition(
                      new BABYLON.Vector3(
                        linkedTransformNode.absolutePosition.x + delta.x,
                        linkedTransformNode.absolutePosition.y + delta.y,
                        linkedTransformNode.absolutePosition.z + delta.z
                      )
                    );
                  }
                );
                const yPositionObservable = gizmoManger.gizmos.positionGizmo!.yGizmo.dragBehavior.onDragObservable.add(
                  ({ delta }) => {
                    linkedTransformNode.setAbsolutePosition(
                      new BABYLON.Vector3(
                        linkedTransformNode.absolutePosition.x + delta.x,
                        linkedTransformNode.absolutePosition.y + delta.y,
                        linkedTransformNode.absolutePosition.z + delta.z
                      )
                    );
                  }
                );
                const zPositionObservable = gizmoManger.gizmos.positionGizmo!.zGizmo.dragBehavior.onDragObservable.add(
                  ({ delta }) => {
                    linkedTransformNode.setAbsolutePosition(
                      new BABYLON.Vector3(
                        linkedTransformNode.absolutePosition.x + delta.x,
                        linkedTransformNode.absolutePosition.y + delta.y,
                        linkedTransformNode.absolutePosition.z + delta.z
                      )
                    );
                  }
                );

                return () => {
                  gizmoManger.gizmos.positionGizmo!.xGizmo.dragBehavior.onDragObservable.remove(
                    xPositionObservable
                  );
                  gizmoManger.gizmos.positionGizmo!.yGizmo.dragBehavior.onDragObservable.remove(
                    yPositionObservable
                  );
                  gizmoManger.gizmos.positionGizmo!.zGizmo.dragBehavior.onDragObservable.remove(
                    zPositionObservable
                  );
                  removeOutlineFromMesh(currentGizmoTarget as BABYLON.Mesh);
                };
              } else if (
                gizmoManger.rotationGizmoEnabled &&
                currentGizmoMode === "rotation"
              ) {
                const lastDragPosition = new BABYLON.Vector3();
                const rotationMatrix = new BABYLON.Matrix();
                const planeNormalTowardsCamera = new BABYLON.Vector3();
                let localPlaneNormalTowardsCamera = new BABYLON.Vector3();
                let currentSnapDragDistance = 0;
                const tmpMatrix = new BABYLON.Matrix();
                const amountToRotate = new BABYLON.Quaternion();

                const xRotationDragStartObservable = gizmoManger.gizmos.rotationGizmo!.xGizmo.dragBehavior.onDragStartObservable.add(
                  ({ dragPlanePoint, pointerId }) => {
                    // set drag start point as lastDragPosition
                    lastDragPosition.copyFrom(dragPlanePoint);
                  }
                );
                const xRotationDragObservable = gizmoManger.gizmos.rotationGizmo!.xGizmo.dragBehavior.onDragObservable.add(
                  ({ dragPlanePoint, dragDistance }) => {
                    // decompose the world matrix of the linkedTransformNode
                    const nodeScale = new BABYLON.Vector3(1, 1, 1);
                    const nodeQuaternion = new BABYLON.Quaternion(0, 0, 0, 1);
                    const nodeTranslation = new BABYLON.Vector3(0, 0, 0);
                    linkedTransformNode
                      .getWorldMatrix()
                      .decompose(nodeScale, nodeQuaternion, nodeTranslation);

                    const newVector = dragPlanePoint
                      .subtract(nodeTranslation)
                      .normalize();
                    const originalVector = lastDragPosition
                      .subtract(nodeTranslation)
                      .normalize();

                    const cross = BABYLON.Vector3.Cross(
                      newVector,
                      originalVector
                    );
                    const dot = BABYLON.Vector3.Dot(newVector, originalVector);

                    // cross.length() can be the reason of the bug
                    let angle = Math.atan2(cross.length(), dot);

                    const planeNormal = new BABYLON.Vector3(1, 0, 0);
                    planeNormalTowardsCamera.copyFrom(planeNormal);
                    localPlaneNormalTowardsCamera.copyFrom(planeNormal);
                    if (
                      gizmoManger.gizmos.rotationGizmo!.xGizmo
                        .updateGizmoRotationToMatchAttachedMesh
                    ) {
                      nodeQuaternion.toRotationMatrix(rotationMatrix);
                      localPlaneNormalTowardsCamera = BABYLON.Vector3.TransformCoordinates(
                        planeNormalTowardsCamera,
                        rotationMatrix
                      );
                    }

                    // Flip up vector depending on which side the camera is on
                    let cameraFlipped = false;
                    if (
                      gizmoManger.gizmos.rotationGizmo!.xGizmo.gizmoLayer
                        .utilityLayerScene.activeCamera
                    ) {
                      var camVec = gizmoManger.gizmos.rotationGizmo!.xGizmo.gizmoLayer.utilityLayerScene.activeCamera.position.subtract(
                        nodeTranslation
                      );
                      if (
                        BABYLON.Vector3.Dot(
                          camVec,
                          localPlaneNormalTowardsCamera
                        ) > 0
                      ) {
                        planeNormalTowardsCamera.scaleInPlace(-1);
                        localPlaneNormalTowardsCamera.scaleInPlace(-1);
                        cameraFlipped = true;
                      }
                    }
                    var halfCircleSide =
                      BABYLON.Vector3.Dot(
                        localPlaneNormalTowardsCamera,
                        cross
                      ) > 0.0;
                    if (halfCircleSide) {
                      angle = -angle;
                    }
                    if (
                      gizmoManger.gizmos.rotationGizmo!.xGizmo.snapDistance !==
                      0
                    ) {
                      currentSnapDragDistance += angle;
                      if (
                        Math.abs(currentSnapDragDistance) >
                        gizmoManger.gizmos.rotationGizmo!.xGizmo.snapDistance
                      ) {
                        let dragSteps = Math.floor(
                          Math.abs(currentSnapDragDistance) /
                            gizmoManger.gizmos.rotationGizmo!.xGizmo
                              .snapDistance
                        );
                        if (currentSnapDragDistance < 0) {
                          dragSteps *= -1;
                        }
                        currentSnapDragDistance =
                          currentSnapDragDistance %
                          gizmoManger.gizmos.rotationGizmo!.xGizmo.snapDistance;
                        angle =
                          gizmoManger.gizmos.rotationGizmo!.xGizmo
                            .snapDistance * dragSteps;
                      } else {
                        angle = 0;
                      }
                    }

                    dragDistance += cameraFlipped ? -angle : angle;

                    const quaternionCoefficient = Math.sin(angle / 2);
                    amountToRotate.set(
                      planeNormalTowardsCamera.x * quaternionCoefficient,
                      planeNormalTowardsCamera.y * quaternionCoefficient,
                      planeNormalTowardsCamera.z * quaternionCoefficient,
                      Math.cos(angle / 2)
                    );

                    if (tmpMatrix.determinant() > 0) {
                      const tmpVector = new BABYLON.Vector3();
                      amountToRotate.toEulerAnglesToRef(tmpVector);
                      BABYLON.Quaternion.RotationYawPitchRollToRef(
                        tmpVector.y,
                        -tmpVector.x,
                        -tmpVector.z,
                        amountToRotate
                      );
                    }
                    if (
                      gizmoManger.gizmos.rotationGizmo!.xGizmo
                        .updateGizmoRotationToMatchAttachedMesh
                    ) {
                      nodeQuaternion.multiplyToRef(
                        amountToRotate,
                        nodeQuaternion
                      );
                    } else {
                      amountToRotate.multiplyToRef(
                        nodeQuaternion,
                        nodeQuaternion
                      );
                    }
                    linkedTransformNode.addRotation(
                      2 * amountToRotate.x,
                      2 * amountToRotate.y,
                      2 * amountToRotate.z
                    );
                    lastDragPosition.copyFrom(dragPlanePoint);
                  }
                );
                const yRotationDragStartObservable = gizmoManger.gizmos.rotationGizmo!.yGizmo.dragBehavior.onDragStartObservable.add(
                  ({ dragPlanePoint, pointerId }) => {
                    // set drag start point as lastDragPosition
                    lastDragPosition.copyFrom(dragPlanePoint);
                  }
                );
                const yRotationDragObservable = gizmoManger.gizmos.rotationGizmo!.yGizmo.dragBehavior.onDragObservable.add(
                  ({
                    delta,
                    dragPlanePoint,
                    dragPlaneNormal,
                    dragDistance,
                    pointerId,
                  }) => {
                    // decompose the world matrix of the linkedTransformNode
                    const nodeScale = new BABYLON.Vector3(1, 1, 1);
                    const nodeQuaternion = new BABYLON.Quaternion(0, 0, 0, 1);
                    const nodeTranslation = new BABYLON.Vector3(0, 0, 0);
                    linkedTransformNode
                      .getWorldMatrix()
                      .decompose(nodeScale, nodeQuaternion, nodeTranslation);

                    const newVector = dragPlanePoint
                      .subtract(nodeTranslation)
                      .normalize();
                    const originalVector = lastDragPosition
                      .subtract(nodeTranslation)
                      .normalize();

                    const cross = BABYLON.Vector3.Cross(
                      newVector,
                      originalVector
                    );
                    const dot = BABYLON.Vector3.Dot(newVector, originalVector);

                    // cross.length() can be the reason of the bug
                    let angle = Math.atan2(cross.length(), dot);

                    const planeNormal = new BABYLON.Vector3(0, 1, 0);
                    planeNormalTowardsCamera.copyFrom(planeNormal);
                    localPlaneNormalTowardsCamera.copyFrom(planeNormal);
                    if (
                      gizmoManger.gizmos.rotationGizmo!.xGizmo
                        .updateGizmoRotationToMatchAttachedMesh
                    ) {
                      nodeQuaternion.toRotationMatrix(rotationMatrix);
                      localPlaneNormalTowardsCamera = BABYLON.Vector3.TransformCoordinates(
                        planeNormalTowardsCamera,
                        rotationMatrix
                      );
                    }

                    // Flip up vector depending on which side the camera is on
                    let cameraFlipped = false;
                    if (
                      gizmoManger.gizmos.rotationGizmo!.xGizmo.gizmoLayer
                        .utilityLayerScene.activeCamera
                    ) {
                      var camVec = gizmoManger.gizmos.rotationGizmo!.xGizmo.gizmoLayer.utilityLayerScene.activeCamera.position.subtract(
                        nodeTranslation
                      );
                      if (
                        BABYLON.Vector3.Dot(
                          camVec,
                          localPlaneNormalTowardsCamera
                        ) > 0
                      ) {
                        planeNormalTowardsCamera.scaleInPlace(-1);
                        localPlaneNormalTowardsCamera.scaleInPlace(-1);
                        cameraFlipped = true;
                      }
                    }
                    var halfCircleSide =
                      BABYLON.Vector3.Dot(
                        localPlaneNormalTowardsCamera,
                        cross
                      ) > 0.0;
                    if (halfCircleSide) {
                      angle = -angle;
                    }
                    if (
                      gizmoManger.gizmos.rotationGizmo!.xGizmo.snapDistance !==
                      0
                    ) {
                      currentSnapDragDistance += angle;
                      if (
                        Math.abs(currentSnapDragDistance) >
                        gizmoManger.gizmos.rotationGizmo!.xGizmo.snapDistance
                      ) {
                        let dragSteps = Math.floor(
                          Math.abs(currentSnapDragDistance) /
                            gizmoManger.gizmos.rotationGizmo!.xGizmo
                              .snapDistance
                        );
                        if (currentSnapDragDistance < 0) {
                          dragSteps *= -1;
                        }
                        currentSnapDragDistance =
                          currentSnapDragDistance %
                          gizmoManger.gizmos.rotationGizmo!.xGizmo.snapDistance;
                        angle =
                          gizmoManger.gizmos.rotationGizmo!.xGizmo
                            .snapDistance * dragSteps;
                      } else {
                        angle = 0;
                      }
                    }

                    dragDistance += cameraFlipped ? -angle : angle;

                    const quaternionCoefficient = Math.sin(angle / 2);
                    amountToRotate.set(
                      planeNormalTowardsCamera.x * quaternionCoefficient,
                      planeNormalTowardsCamera.y * quaternionCoefficient,
                      planeNormalTowardsCamera.z * quaternionCoefficient,
                      Math.cos(angle / 2)
                    );

                    if (tmpMatrix.determinant() > 0) {
                      const tmpVector = new BABYLON.Vector3();
                      amountToRotate.toEulerAnglesToRef(tmpVector);
                      BABYLON.Quaternion.RotationYawPitchRollToRef(
                        tmpVector.y,
                        -tmpVector.x,
                        -tmpVector.z,
                        amountToRotate
                      );
                    }
                    if (
                      gizmoManger.gizmos.rotationGizmo!.xGizmo
                        .updateGizmoRotationToMatchAttachedMesh
                    ) {
                      nodeQuaternion.multiplyToRef(
                        amountToRotate,
                        nodeQuaternion
                      );
                    } else {
                      amountToRotate.multiplyToRef(
                        nodeQuaternion,
                        nodeQuaternion
                      );
                    }
                    linkedTransformNode.addRotation(
                      2 * amountToRotate.x,
                      2 * amountToRotate.y,
                      2 * amountToRotate.z
                    );
                    lastDragPosition.copyFrom(dragPlanePoint);
                  }
                );
                const zRotationDragStartObservable = gizmoManger.gizmos.rotationGizmo!.zGizmo.dragBehavior.onDragStartObservable.add(
                  ({ dragPlanePoint, pointerId }) => {
                    // set drag start point as lastDragPosition
                    lastDragPosition.copyFrom(dragPlanePoint);
                  }
                );
                const zRotationDragObservable = gizmoManger.gizmos.rotationGizmo!.zGizmo.dragBehavior.onDragObservable.add(
                  ({
                    delta,
                    dragPlanePoint,
                    dragPlaneNormal,
                    dragDistance,
                    pointerId,
                  }) => {
                    // decompose the world matrix of the linkedTransformNode
                    const nodeScale = new BABYLON.Vector3(1, 1, 1);
                    const nodeQuaternion = new BABYLON.Quaternion(0, 0, 0, 1);
                    const nodeTranslation = new BABYLON.Vector3(0, 0, 0);
                    linkedTransformNode
                      .getWorldMatrix()
                      .decompose(nodeScale, nodeQuaternion, nodeTranslation);

                    const newVector = dragPlanePoint
                      .subtract(nodeTranslation)
                      .normalize();
                    const originalVector = lastDragPosition
                      .subtract(nodeTranslation)
                      .normalize();

                    const cross = BABYLON.Vector3.Cross(
                      newVector,
                      originalVector
                    );
                    const dot = BABYLON.Vector3.Dot(newVector, originalVector);

                    // cross.length() can be the reason of the bug
                    let angle = Math.atan2(cross.length(), dot);

                    const planeNormal = new BABYLON.Vector3(0, 0, 1);
                    planeNormalTowardsCamera.copyFrom(planeNormal);
                    localPlaneNormalTowardsCamera.copyFrom(planeNormal);
                    if (
                      gizmoManger.gizmos.rotationGizmo!.xGizmo
                        .updateGizmoRotationToMatchAttachedMesh
                    ) {
                      nodeQuaternion.toRotationMatrix(rotationMatrix);
                      localPlaneNormalTowardsCamera = BABYLON.Vector3.TransformCoordinates(
                        planeNormalTowardsCamera,
                        rotationMatrix
                      );
                    }

                    // Flip up vector depending on which side the camera is on
                    let cameraFlipped = false;
                    if (
                      gizmoManger.gizmos.rotationGizmo!.xGizmo.gizmoLayer
                        .utilityLayerScene.activeCamera
                    ) {
                      var camVec = gizmoManger.gizmos.rotationGizmo!.xGizmo.gizmoLayer.utilityLayerScene.activeCamera.position.subtract(
                        nodeTranslation
                      );
                      if (
                        BABYLON.Vector3.Dot(
                          camVec,
                          localPlaneNormalTowardsCamera
                        ) > 0
                      ) {
                        planeNormalTowardsCamera.scaleInPlace(-1);
                        localPlaneNormalTowardsCamera.scaleInPlace(-1);
                        cameraFlipped = true;
                      }
                    }
                    var halfCircleSide =
                      BABYLON.Vector3.Dot(
                        localPlaneNormalTowardsCamera,
                        cross
                      ) > 0.0;
                    if (halfCircleSide) {
                      angle = -angle;
                    }
                    if (
                      gizmoManger.gizmos.rotationGizmo!.xGizmo.snapDistance !==
                      0
                    ) {
                      currentSnapDragDistance += angle;
                      if (
                        Math.abs(currentSnapDragDistance) >
                        gizmoManger.gizmos.rotationGizmo!.xGizmo.snapDistance
                      ) {
                        let dragSteps = Math.floor(
                          Math.abs(currentSnapDragDistance) /
                            gizmoManger.gizmos.rotationGizmo!.xGizmo
                              .snapDistance
                        );
                        if (currentSnapDragDistance < 0) {
                          dragSteps *= -1;
                        }
                        currentSnapDragDistance =
                          currentSnapDragDistance %
                          gizmoManger.gizmos.rotationGizmo!.xGizmo.snapDistance;
                        angle =
                          gizmoManger.gizmos.rotationGizmo!.xGizmo
                            .snapDistance * dragSteps;
                      } else {
                        angle = 0;
                      }
                    }

                    dragDistance += cameraFlipped ? -angle : angle;

                    const quaternionCoefficient = Math.sin(angle / 2);
                    amountToRotate.set(
                      planeNormalTowardsCamera.x * quaternionCoefficient,
                      planeNormalTowardsCamera.y * quaternionCoefficient,
                      planeNormalTowardsCamera.z * quaternionCoefficient,
                      Math.cos(angle / 2)
                    );

                    if (tmpMatrix.determinant() > 0) {
                      const tmpVector = new BABYLON.Vector3();
                      amountToRotate.toEulerAnglesToRef(tmpVector);
                      BABYLON.Quaternion.RotationYawPitchRollToRef(
                        tmpVector.y,
                        -tmpVector.x,
                        -tmpVector.z,
                        amountToRotate
                      );
                    }
                    if (
                      gizmoManger.gizmos.rotationGizmo!.xGizmo
                        .updateGizmoRotationToMatchAttachedMesh
                    ) {
                      nodeQuaternion.multiplyToRef(
                        amountToRotate,
                        nodeQuaternion
                      );
                    } else {
                      amountToRotate.multiplyToRef(
                        nodeQuaternion,
                        nodeQuaternion
                      );
                    }
                    linkedTransformNode.addRotation(
                      2 * amountToRotate.x,
                      2 * amountToRotate.y,
                      2 * amountToRotate.z
                    );
                    lastDragPosition.copyFrom(dragPlanePoint);
                  }
                );
                return () => {
                  gizmoManger.gizmos.rotationGizmo!.xGizmo.dragBehavior.onDragStartObservable.remove(
                    xRotationDragStartObservable
                  );
                  gizmoManger.gizmos.rotationGizmo!.xGizmo.dragBehavior.onDragObservable.remove(
                    xRotationDragObservable
                  );
                  gizmoManger.gizmos.rotationGizmo!.yGizmo.dragBehavior.onDragStartObservable.remove(
                    yRotationDragStartObservable
                  );
                  gizmoManger.gizmos.rotationGizmo!.yGizmo.dragBehavior.onDragObservable.remove(
                    yRotationDragObservable
                  );
                  gizmoManger.gizmos.rotationGizmo!.zGizmo.dragBehavior.onDragStartObservable.remove(
                    zRotationDragStartObservable
                  );
                  gizmoManger.gizmos.rotationGizmo!.zGizmo.dragBehavior.onDragObservable.remove(
                    zRotationDragObservable
                  );
                  removeOutlineFromMesh(currentGizmoTarget as BABYLON.Mesh);
                };
              } else if (
                gizmoManger.scaleGizmoEnabled &&
                currentGizmoMode === "scale"
              ) {
                const xScaleObservable = gizmoManger.gizmos.scaleGizmo!.xGizmo.dragBehavior.onDragObservable.add(
                  ({ delta }) => {
                    linkedTransformNode.scaling = new BABYLON.Vector3(
                      linkedTransformNode.scaling.x + delta.x,
                      linkedTransformNode.scaling.y + delta.y,
                      linkedTransformNode.scaling.z + delta.z
                    );
                  }
                );
                const yScaleObservable = gizmoManger.gizmos.scaleGizmo!.yGizmo.dragBehavior.onDragObservable.add(
                  ({ delta }) => {
                    linkedTransformNode.scaling = new BABYLON.Vector3(
                      linkedTransformNode.scaling.x + delta.x,
                      linkedTransformNode.scaling.y + delta.y,
                      linkedTransformNode.scaling.z + delta.z
                    );
                  }
                );
                const zScaleObservable = gizmoManger.gizmos.scaleGizmo!.zGizmo.dragBehavior.onDragObservable.add(
                  ({ delta }) => {
                    linkedTransformNode.scaling = new BABYLON.Vector3(
                      linkedTransformNode.scaling.x + delta.x,
                      linkedTransformNode.scaling.y + delta.y,
                      linkedTransformNode.scaling.z + delta.z
                    );
                  }
                );

                return () => {
                  gizmoManger.gizmos.scaleGizmo!.xGizmo.dragBehavior.onDragObservable.remove(
                    xScaleObservable
                  );
                  gizmoManger.gizmos.scaleGizmo!.yGizmo.dragBehavior.onDragObservable.remove(
                    yScaleObservable
                  );
                  gizmoManger.gizmos.scaleGizmo!.zGizmo.dragBehavior.onDragObservable.remove(
                    zScaleObservable
                  );
                  removeOutlineFromMesh(currentGizmoTarget as BABYLON.Mesh);
                };
              }
              // } else {
              //   console.log("else");
              //   switch (currentGizmoMode) {
              //     case "position": {
              //       gizmoManger.positionGizmoEnabled = true;
              //       const xPositionObservable = gizmoManger.gizmos.positionGizmo!.xGizmo.dragBehavior.onDragObservable.add(
              //         ({ delta }) => {
              //           linkedTransformNode.setAbsolutePosition(
              //             new BABYLON.Vector3(
              //               linkedTransformNode.absolutePosition.x + delta.x,
              //               linkedTransformNode.absolutePosition.y + delta.y,
              //               linkedTransformNode.absolutePosition.z + delta.z
              //             )
              //           );
              //         }
              //       );
              //       const yPositionObservable = gizmoManger.gizmos.positionGizmo!.yGizmo.dragBehavior.onDragObservable.add(
              //         ({ delta }) => {
              //           linkedTransformNode.setAbsolutePosition(
              //             new BABYLON.Vector3(
              //               linkedTransformNode.absolutePosition.x + delta.x,
              //               linkedTransformNode.absolutePosition.y + delta.y,
              //               linkedTransformNode.absolutePosition.z + delta.z
              //             )
              //           );
              //         }
              //       );
              //       const zPositionObservable = gizmoManger.gizmos.positionGizmo!.zGizmo.dragBehavior.onDragObservable.add(
              //         ({ delta }) => {
              //           linkedTransformNode.setAbsolutePosition(
              //             new BABYLON.Vector3(
              //               linkedTransformNode.absolutePosition.x + delta.x,
              //               linkedTransformNode.absolutePosition.y + delta.y,
              //               linkedTransformNode.absolutePosition.z + delta.z
              //             )
              //           );
              //         }
              //       );

              //       return () => {
              //         gizmoManger.gizmos.positionGizmo!.xGizmo.dragBehavior.onDragObservable.remove(
              //           xPositionObservable
              //         );
              //         gizmoManger.gizmos.positionGizmo!.yGizmo.dragBehavior.onDragObservable.remove(
              //           yPositionObservable
              //         );
              //         gizmoManger.gizmos.positionGizmo!.zGizmo.dragBehavior.onDragObservable.remove(
              //           zPositionObservable
              //         );
              //         removeOutlineFromMesh(currentGizmoTarget as BABYLON.Mesh);
              //       };
              //     }
              //     case "rotation": {
              //       gizmoManger.rotationGizmoEnabled = true;
              //       break;
              //     }
              //     case "scale": {
              //       gizmoManger.scaleGizmoEnabled = true;
              //       break;
              //     }
              //     default: {
              //       break;
              //     }
              //   }
              // }
            }
          }
        }
      }
    } else if (gizmoManger && selectedTargets.length > 1) {
      // when multiple targets are selected
    }
  }, [currentGizmoMode, gizmoManger, modelAssets, selectedTargets]);

  // when new file is dropped
  useEffect(() => {
    if (
      renderingCanvas.current &&
      renderingCanvas.current.id === "renderingCanvas1"
    ) {
      const loadFbxFile = async (file: File, scene: BABYLON.Scene) => {
        const glbFileUrl = await convertFbxToGlb(file)
          .then((res) => res)
          .catch((err) => alert(err));

        const loadedAssetContainer = await BABYLON.SceneLoader.LoadAssetContainerAsync(
          glbFileUrl,
          "",
          scene
        );

        const {
          animationGroups,
          meshes,
          skeletons,
          transformNodes,
        } = loadedAssetContainer;

        const newContainer = {
          id: uuidv4(),
          fileName: file.name,
          animationGroups,
          meshes,
          skeleton: skeletons[0],
          transformNodes,
          controllers: [],
        };

        dispatch(loadModelAssets({ newContainer }));
      };

      const loadGlbFile = async (file: unknown, scene: BABYLON.Scene) => {
        const loadedAssetContainer = await BABYLON.SceneLoader.LoadAssetContainerAsync(
          "file:",
          file as string, // error without type assertion
          scene
        );

        const {
          animationGroups,
          meshes,
          skeletons,
          transformNodes,
        } = loadedAssetContainer;

        const newContainer = {
          id: uuidv4(),
          // @ts-ignore
          fileName: file.name,
          animationGroups,
          meshes,
          skeleton: skeletons[0],
          transformNodes,
          controllers: [],
        };

        dispatch(loadModelAssets({ newContainer }));
      };

      if (scene && currentFile) {
        let fileExtension;

        try {
          fileExtension = getFileExtension(currentFile);
        } catch (error) {
          alert("Can't get the extension of this file.");
        }

        if (fileExtension) {
          if (fileExtension === "glb") {
            loadGlbFile(currentFile, scene);
          } else if (fileExtension === "fbx") {
            loadFbxFile(currentFile, scene);
          }
        }
      }
    }
  }, [currentFile, dispatch, renderingCanvas, scene]);

  // manage gizmo shortcut
  useEffect(() => {
    if (gizmoManger) {
      const handleKeyDown = (event: KeyboardEvent) => {
        // console.log(event.key);
        switch (event.key) {
          // case "q":
          // case "Q":
          // case "ㅂ": {
          //   if (gizmoManger.gizmos.positionGizmo) {
          //     gizmoManger.gizmos.positionGizmo.updateGizmoPositionToMatchAttachedMesh = !gizmoManger
          //       .gizmos.positionGizmo.updateGizmoPositionToMatchAttachedMesh;
          //   } else if (gizmoManger.gizmos.rotationGizmo) {
          //     gizmoManger.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = !gizmoManger
          //       .gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh;
          //   }
          //   break;
          // }
          case "w":
          case "W":
          case "ㅈ": {
            setCurrentGizmoMode("position");
            gizmoManger.positionGizmoEnabled = true;
            gizmoManger.rotationGizmoEnabled = false;
            gizmoManger.scaleGizmoEnabled = false;
            break;
          }
          case "e":
          case "E":
          case "ㄷ": {
            setCurrentGizmoMode("rotation");
            gizmoManger.positionGizmoEnabled = false;
            gizmoManger.rotationGizmoEnabled = true;
            gizmoManger.scaleGizmoEnabled = false;
            break;
          }
          case "r":
          case "R":
          case "ㄱ": {
            setCurrentGizmoMode("scale");
            gizmoManger.positionGizmoEnabled = false;
            gizmoManger.rotationGizmoEnabled = false;
            gizmoManger.scaleGizmoEnabled = true;
            break;
          }
          case "Escape": {
            gizmoManger.attachToNode(null);
            setSelectedTargets([]);
            break;
          }
          default: {
            break;
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [gizmoManger, setSelectedTargets]);

  return {};
};

export default useRendering;
