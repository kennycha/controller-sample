import { RefObject, useEffect, useState } from "react";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import {
  addOutlineToMesh,
  checkIsIncluded,
  convertFbxToGlb,
  getFileExtension,
  removeOutlineFromMesh,
} from "../utils";
import { loadModelAssets } from "../actions/modelAssets";
import { useSelector } from "../reducers";
import { ShootArcRotateCameraPointersInput } from "../utils/customCameraInputs/ShootArcRotateCameraPointersInput";

const OUTLINE_COLOR = BABYLON.Color3.Red();
const OUTLINE_WIDTH = 0.3;
type Nullable<T> = T | null;
type ScreenXY = { x: number; y: number };

const useRendering = (
  currentFile: File | null,
  renderingCanvas: RefObject<HTMLCanvasElement>,
  selectedTargets: (BABYLON.TransformNode | BABYLON.Mesh)[],
  setSelectedTargets: React.Dispatch<
    React.SetStateAction<(BABYLON.Mesh | BABYLON.TransformNode)[]>
  >
) => {
  const [scene, setScene] = useState<BABYLON.Scene | null>(null);
  const [gizmoManager, setGizmoManager] = useState<BABYLON.GizmoManager | null>(
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
          const ground = BABYLON.Mesh.CreateGround("ground", 20, 20, 20, scene);
          const groundMaterial = new BABYLON.StandardMaterial(
            "groundMaterial",
            scene
          );
          groundMaterial.emissiveColor = BABYLON.Color3.Black();
          groundMaterial.alpha = 0.2;
          ground.material = groundMaterial;
          ground.isPickable = false;
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
      innerScene.clearColor = BABYLON.Color4.FromColor3(
        BABYLON.Color3.FromHexString("#242424")
      );

      // set scene actionManager
      innerScene.actionManager = new BABYLON.ActionManager(innerScene);

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

  // dragBox setting for loadedAssets updated
  useEffect(() => {
    if (scene && scene.isReady()) {
      let startPointerPosition: Nullable<ScreenXY> = null;
      const dragBox = document.querySelector("#_dragBox") as HTMLDivElement;
      const dragBoxDefaultStyle =
        "background-color: gray; position: absolute; opacity: 0.3; pointer-events: none;";
      dragBox.setAttribute("style", dragBoxDefaultStyle);

      const dragBoxObserver = scene.onPointerObservable.add(
        (pointerInfo, eventState) => {
          // pointer down event catched
          switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN: {
              if (
                pointerInfo?.event.button === 0 && // check if it it left click
                !pointerInfo.pickInfo!.hit // pickInfo always exist with pointer event
              ) {
                // set start point of the dragBox
                startPointerPosition = {
                  x: scene.pointerX,
                  y: scene.pointerY,
                };
              }
              break;
            }
            case BABYLON.PointerEventTypes.POINTERMOVE: {
              if (startPointerPosition) {
                const currentPointerPosition: Nullable<ScreenXY> = {
                  x: scene.pointerX,
                  y: scene.pointerY,
                };

                const minX = Math.min(
                  startPointerPosition.x,
                  currentPointerPosition.x
                );
                const minY = Math.min(
                  startPointerPosition.y,
                  currentPointerPosition.y
                );
                const maxX = Math.max(
                  startPointerPosition.x,
                  currentPointerPosition.x
                );
                const maxY = Math.max(
                  startPointerPosition.y,
                  currentPointerPosition.y
                );

                dragBox.setAttribute(
                  "style",
                  `${dragBoxDefaultStyle} left: ${minX}px; top: ${minY}px; width: ${
                    maxX - minX
                  }px; height: ${maxY - minY}px;`
                );
              }
              break;
            }
            case BABYLON.PointerEventTypes.POINTERUP: {
              if (startPointerPosition) {
                if (
                  modelAssets[0] &&
                  modelAssets[0].skeleton &&
                  modelAssets[0].controllers
                ) {
                  const { skeleton, controllers } = modelAssets[0];

                  const endPointerPosition: Nullable<ScreenXY> = {
                    x: scene.pointerX,
                    y: scene.pointerY,
                  };

                  const selectedTransformNodes = skeleton.bones
                    .map((bone) => bone.getTransformNode())
                    .filter((transformNode) =>
                      checkIsIncluded(
                        startPointerPosition as ScreenXY,
                        endPointerPosition,
                        transformNode!.getAbsolutePosition(),
                        scene
                      )
                    ) as BABYLON.TransformNode[];
                  const selectedControllers = controllers.filter((controller) =>
                    checkIsIncluded(
                      startPointerPosition as ScreenXY,
                      endPointerPosition,
                      controller.getAbsolutePosition(),
                      scene
                    )
                  );

                  setSelectedTargets([
                    ...selectedTransformNodes,
                    ...selectedControllers,
                  ]);
                }

                // initialize style and start point
                startPointerPosition = null;
                dragBox.setAttribute("style", dragBoxDefaultStyle);
              }
              break;
            }
            default: {
              break;
            }
          }
        }
      );
      return () => {
        scene.onPointerObservable.remove(dragBoxObserver);
      };
    }
  }, [modelAssets, scene, setSelectedTargets]);

  // when gizmo target or mode changed
  useEffect(() => {
    // when the only target is selected
    if (gizmoManager && selectedTargets.length === 1) {
      const currentGizmoTarget = selectedTargets[0];
      // attach gizmo
      if (currentGizmoTarget.getClassName() === "TransformNode") {
        if (gizmoManager.positionGizmoEnabled) {
        } else if (gizmoManager.rotationGizmoEnabled) {
        } else if (gizmoManager.scaleGizmoEnabled) {
        } else {
          switch (currentGizmoMode) {
            case "position": {
              gizmoManager.positionGizmoEnabled = true;
              break;
            }
            case "rotation": {
              gizmoManager.rotationGizmoEnabled = true;
              break;
            }
            case "scale": {
              gizmoManager.scaleGizmoEnabled = true;
              break;
            }
            default: {
              break;
            }
          }
        }
        gizmoManager.attachToNode(currentGizmoTarget);

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
        gizmoManager.attachToMesh(currentGizmoTarget as BABYLON.Mesh);

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
                gizmoManager.positionGizmoEnabled &&
                currentGizmoMode === "position"
              ) {
                const xPositionObservable = gizmoManager.gizmos.positionGizmo!.xGizmo.dragBehavior.onDragObservable.add(
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
                const yPositionObservable = gizmoManager.gizmos.positionGizmo!.yGizmo.dragBehavior.onDragObservable.add(
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
                const zPositionObservable = gizmoManager.gizmos.positionGizmo!.zGizmo.dragBehavior.onDragObservable.add(
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
                  gizmoManager.gizmos.positionGizmo!.xGizmo.dragBehavior.onDragObservable.remove(
                    xPositionObservable
                  );
                  gizmoManager.gizmos.positionGizmo!.yGizmo.dragBehavior.onDragObservable.remove(
                    yPositionObservable
                  );
                  gizmoManager.gizmos.positionGizmo!.zGizmo.dragBehavior.onDragObservable.remove(
                    zPositionObservable
                  );
                  removeOutlineFromMesh(currentGizmoTarget as BABYLON.Mesh);
                };
              } else if (
                gizmoManager.rotationGizmoEnabled &&
                currentGizmoMode === "rotation"
              ) {
                const lastDragPosition = new BABYLON.Vector3();
                const rotationMatrix = new BABYLON.Matrix();
                const planeNormalTowardsCamera = new BABYLON.Vector3();
                let localPlaneNormalTowardsCamera = new BABYLON.Vector3();
                let currentSnapDragDistance = 0;
                const tmpMatrix = new BABYLON.Matrix();
                const amountToRotate = new BABYLON.Quaternion();

                const xRotationDragStartObservable = gizmoManager.gizmos.rotationGizmo!.xGizmo.dragBehavior.onDragStartObservable.add(
                  ({ dragPlanePoint, pointerId }) => {
                    // set drag start point as lastDragPosition
                    lastDragPosition.copyFrom(dragPlanePoint);
                  }
                );
                const xRotationDragObservable = gizmoManager.gizmos.rotationGizmo!.xGizmo.dragBehavior.onDragObservable.add(
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
                      gizmoManager.gizmos.rotationGizmo!.xGizmo
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
                      gizmoManager.gizmos.rotationGizmo!.xGizmo.gizmoLayer
                        .utilityLayerScene.activeCamera
                    ) {
                      var camVec = gizmoManager.gizmos.rotationGizmo!.xGizmo.gizmoLayer.utilityLayerScene.activeCamera.position.subtract(
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
                      gizmoManager.gizmos.rotationGizmo!.xGizmo.snapDistance !==
                      0
                    ) {
                      currentSnapDragDistance += angle;
                      if (
                        Math.abs(currentSnapDragDistance) >
                        gizmoManager.gizmos.rotationGizmo!.xGizmo.snapDistance
                      ) {
                        let dragSteps = Math.floor(
                          Math.abs(currentSnapDragDistance) /
                            gizmoManager.gizmos.rotationGizmo!.xGizmo
                              .snapDistance
                        );
                        if (currentSnapDragDistance < 0) {
                          dragSteps *= -1;
                        }
                        currentSnapDragDistance =
                          currentSnapDragDistance %
                          gizmoManager.gizmos.rotationGizmo!.xGizmo
                            .snapDistance;
                        angle =
                          gizmoManager.gizmos.rotationGizmo!.xGizmo
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
                      gizmoManager.gizmos.rotationGizmo!.xGizmo
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
                const yRotationDragStartObservable = gizmoManager.gizmos.rotationGizmo!.yGizmo.dragBehavior.onDragStartObservable.add(
                  ({ dragPlanePoint, pointerId }) => {
                    // set drag start point as lastDragPosition
                    lastDragPosition.copyFrom(dragPlanePoint);
                  }
                );
                const yRotationDragObservable = gizmoManager.gizmos.rotationGizmo!.yGizmo.dragBehavior.onDragObservable.add(
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
                      gizmoManager.gizmos.rotationGizmo!.xGizmo
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
                      gizmoManager.gizmos.rotationGizmo!.xGizmo.gizmoLayer
                        .utilityLayerScene.activeCamera
                    ) {
                      var camVec = gizmoManager.gizmos.rotationGizmo!.xGizmo.gizmoLayer.utilityLayerScene.activeCamera.position.subtract(
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
                      gizmoManager.gizmos.rotationGizmo!.xGizmo.snapDistance !==
                      0
                    ) {
                      currentSnapDragDistance += angle;
                      if (
                        Math.abs(currentSnapDragDistance) >
                        gizmoManager.gizmos.rotationGizmo!.xGizmo.snapDistance
                      ) {
                        let dragSteps = Math.floor(
                          Math.abs(currentSnapDragDistance) /
                            gizmoManager.gizmos.rotationGizmo!.xGizmo
                              .snapDistance
                        );
                        if (currentSnapDragDistance < 0) {
                          dragSteps *= -1;
                        }
                        currentSnapDragDistance =
                          currentSnapDragDistance %
                          gizmoManager.gizmos.rotationGizmo!.xGizmo
                            .snapDistance;
                        angle =
                          gizmoManager.gizmos.rotationGizmo!.xGizmo
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
                      gizmoManager.gizmos.rotationGizmo!.xGizmo
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
                const zRotationDragStartObservable = gizmoManager.gizmos.rotationGizmo!.zGizmo.dragBehavior.onDragStartObservable.add(
                  ({ dragPlanePoint, pointerId }) => {
                    // set drag start point as lastDragPosition
                    lastDragPosition.copyFrom(dragPlanePoint);
                  }
                );
                const zRotationDragObservable = gizmoManager.gizmos.rotationGizmo!.zGizmo.dragBehavior.onDragObservable.add(
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
                      gizmoManager.gizmos.rotationGizmo!.xGizmo
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
                      gizmoManager.gizmos.rotationGizmo!.xGizmo.gizmoLayer
                        .utilityLayerScene.activeCamera
                    ) {
                      var camVec = gizmoManager.gizmos.rotationGizmo!.xGizmo.gizmoLayer.utilityLayerScene.activeCamera.position.subtract(
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
                      gizmoManager.gizmos.rotationGizmo!.xGizmo.snapDistance !==
                      0
                    ) {
                      currentSnapDragDistance += angle;
                      if (
                        Math.abs(currentSnapDragDistance) >
                        gizmoManager.gizmos.rotationGizmo!.xGizmo.snapDistance
                      ) {
                        let dragSteps = Math.floor(
                          Math.abs(currentSnapDragDistance) /
                            gizmoManager.gizmos.rotationGizmo!.xGizmo
                              .snapDistance
                        );
                        if (currentSnapDragDistance < 0) {
                          dragSteps *= -1;
                        }
                        currentSnapDragDistance =
                          currentSnapDragDistance %
                          gizmoManager.gizmos.rotationGizmo!.xGizmo
                            .snapDistance;
                        angle =
                          gizmoManager.gizmos.rotationGizmo!.xGizmo
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
                      gizmoManager.gizmos.rotationGizmo!.xGizmo
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
                  gizmoManager.gizmos.rotationGizmo!.xGizmo.dragBehavior.onDragStartObservable.remove(
                    xRotationDragStartObservable
                  );
                  gizmoManager.gizmos.rotationGizmo!.xGizmo.dragBehavior.onDragObservable.remove(
                    xRotationDragObservable
                  );
                  gizmoManager.gizmos.rotationGizmo!.yGizmo.dragBehavior.onDragStartObservable.remove(
                    yRotationDragStartObservable
                  );
                  gizmoManager.gizmos.rotationGizmo!.yGizmo.dragBehavior.onDragObservable.remove(
                    yRotationDragObservable
                  );
                  gizmoManager.gizmos.rotationGizmo!.zGizmo.dragBehavior.onDragStartObservable.remove(
                    zRotationDragStartObservable
                  );
                  gizmoManager.gizmos.rotationGizmo!.zGizmo.dragBehavior.onDragObservable.remove(
                    zRotationDragObservable
                  );
                  removeOutlineFromMesh(currentGizmoTarget as BABYLON.Mesh);
                };
              } else if (
                gizmoManager.scaleGizmoEnabled &&
                currentGizmoMode === "scale"
              ) {
                const xScaleObservable = gizmoManager.gizmos.scaleGizmo!.xGizmo.dragBehavior.onDragObservable.add(
                  ({ delta }) => {
                    linkedTransformNode.scaling = new BABYLON.Vector3(
                      linkedTransformNode.scaling.x + delta.x,
                      linkedTransformNode.scaling.y + delta.y,
                      linkedTransformNode.scaling.z + delta.z
                    );
                  }
                );
                const yScaleObservable = gizmoManager.gizmos.scaleGizmo!.yGizmo.dragBehavior.onDragObservable.add(
                  ({ delta }) => {
                    linkedTransformNode.scaling = new BABYLON.Vector3(
                      linkedTransformNode.scaling.x + delta.x,
                      linkedTransformNode.scaling.y + delta.y,
                      linkedTransformNode.scaling.z + delta.z
                    );
                  }
                );
                const zScaleObservable = gizmoManager.gizmos.scaleGizmo!.zGizmo.dragBehavior.onDragObservable.add(
                  ({ delta }) => {
                    linkedTransformNode.scaling = new BABYLON.Vector3(
                      linkedTransformNode.scaling.x + delta.x,
                      linkedTransformNode.scaling.y + delta.y,
                      linkedTransformNode.scaling.z + delta.z
                    );
                  }
                );

                return () => {
                  gizmoManager.gizmos.scaleGizmo!.xGizmo.dragBehavior.onDragObservable.remove(
                    xScaleObservable
                  );
                  gizmoManager.gizmos.scaleGizmo!.yGizmo.dragBehavior.onDragObservable.remove(
                    yScaleObservable
                  );
                  gizmoManager.gizmos.scaleGizmo!.zGizmo.dragBehavior.onDragObservable.remove(
                    zScaleObservable
                  );
                  removeOutlineFromMesh(currentGizmoTarget as BABYLON.Mesh);
                };
              }
              // } else {
              //   console.log("else");
              //   switch (currentGizmoMode) {
              //     case "position": {
              //       gizmoManager.positionGizmoEnabled = true;
              //       const xPositionObservable = gizmoManager.gizmos.positionGizmo!.xGizmo.dragBehavior.onDragObservable.add(
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
              //       const yPositionObservable = gizmoManager.gizmos.positionGizmo!.yGizmo.dragBehavior.onDragObservable.add(
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
              //       const zPositionObservable = gizmoManager.gizmos.positionGizmo!.zGizmo.dragBehavior.onDragObservable.add(
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
              //         gizmoManager.gizmos.positionGizmo!.xGizmo.dragBehavior.onDragObservable.remove(
              //           xPositionObservable
              //         );
              //         gizmoManager.gizmos.positionGizmo!.yGizmo.dragBehavior.onDragObservable.remove(
              //           yPositionObservable
              //         );
              //         gizmoManager.gizmos.positionGizmo!.zGizmo.dragBehavior.onDragObservable.remove(
              //           zPositionObservable
              //         );
              //         removeOutlineFromMesh(currentGizmoTarget as BABYLON.Mesh);
              //       };
              //     }
              //     case "rotation": {
              //       gizmoManager.rotationGizmoEnabled = true;
              //       break;
              //     }
              //     case "scale": {
              //       gizmoManager.scaleGizmoEnabled = true;
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
    } else if (gizmoManager && selectedTargets.length > 1) {
      // when multiple targets are selected
    }
  }, [currentGizmoMode, gizmoManager, modelAssets, selectedTargets]);

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
    if (gizmoManager) {
      const handleKeyDown = (event: KeyboardEvent) => {
        // console.log(event.key);
        switch (event.key) {
          // case "q":
          // case "Q":
          // case "???": {
          //   if (gizmoManager.gizmos.positionGizmo) {
          //     gizmoManager.gizmos.positionGizmo.updateGizmoPositionToMatchAttachedMesh = !gizmoManager
          //       .gizmos.positionGizmo.updateGizmoPositionToMatchAttachedMesh;
          //   } else if (gizmoManager.gizmos.rotationGizmo) {
          //     gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = !gizmoManager
          //       .gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh;
          //   }
          //   break;
          // }
          case "w":
          case "W":
          case "???": {
            setCurrentGizmoMode("position");
            gizmoManager.positionGizmoEnabled = true;
            gizmoManager.rotationGizmoEnabled = false;
            gizmoManager.scaleGizmoEnabled = false;
            break;
          }
          case "e":
          case "E":
          case "???": {
            setCurrentGizmoMode("rotation");
            gizmoManager.positionGizmoEnabled = false;
            gizmoManager.rotationGizmoEnabled = true;
            gizmoManager.scaleGizmoEnabled = false;
            break;
          }
          case "r":
          case "R":
          case "???": {
            setCurrentGizmoMode("scale");
            gizmoManager.positionGizmoEnabled = false;
            gizmoManager.rotationGizmoEnabled = false;
            gizmoManager.scaleGizmoEnabled = true;
            break;
          }
          case "Escape": {
            gizmoManager.attachToNode(null);
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
  }, [gizmoManager, setSelectedTargets]);

  return {};
};

export default useRendering;
