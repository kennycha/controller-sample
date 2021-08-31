import { RefObject, useEffect, useState } from "react";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { convertFbxToGlb, getFileExtension, roundVector3 } from "../utils";
import { loadModelAssets } from "../actions/modelAssets";

const useRendering = (
  currentFile: File | null,
  renderingCanvas: RefObject<HTMLCanvasElement>,
  currentGizmoTarget: BABYLON.TransformNode | BABYLON.Mesh | null,
  setCurrentGizmoTarget: React.Dispatch<
    React.SetStateAction<BABYLON.TransformNode | BABYLON.Mesh | null>
  >
) => {
  const [scene, setScene] = useState<BABYLON.Scene | null>(null);
  const [gizmoManger, setGizmoManager] = useState<BABYLON.GizmoManager | null>(
    null
  );

  const dispatch = useDispatch();

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
        arcRotateCamera.attachControl(renderingCanvas.current, false, true);
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
        innerGizmoManager.onAttachedToMeshObservable.add((mesh) => {
          if (mesh) {
            if (mesh.state.length) {
              const linkedBone = scene.skeletons[0].bones.find(
                (bone) => bone.uniqueId === parseInt(mesh.state)
              );
              if (linkedBone) {
                console.log("------------------------------------------");
                console.log("bone name: ", linkedBone.name);
                console.log(
                  "controller local position: ",
                  roundVector3(mesh.position, 4)
                );
                console.log(
                  "controller absolute position: ",
                  roundVector3(mesh.absolutePosition, 4)
                );
                console.log(
                  "bone local position: ",
                  roundVector3(linkedBone.getPosition(BABYLON.Space.LOCAL), 4)
                );
                console.log(
                  "bone world position: ",
                  roundVector3(linkedBone.getPosition(BABYLON.Space.WORLD), 4)
                );
                console.log(
                  "bone absolute position: ",
                  roundVector3(linkedBone.getAbsolutePosition(), 4)
                );
                const parentController = mesh.parent as BABYLON.Mesh;
                const parentBone = linkedBone.getParent() as BABYLON.Bone;
                if (parentController && parentBone) {
                  console.log("------------------------------------------");
                  console.log("parentBone name: ", parentBone.name);
                  console.log(
                    "parentController local position: ",
                    roundVector3(parentController.position, 4)
                  );
                  console.log(
                    "parentController absolute position: ",
                    roundVector3(parentController.absolutePosition, 4)
                  );
                  console.log(
                    "parentBone local position: ",
                    roundVector3(parentBone.getPosition(BABYLON.Space.LOCAL), 4)
                  );
                  console.log(
                    "parentBone world position: ",
                    roundVector3(parentBone.getPosition(BABYLON.Space.WORLD), 4)
                  );
                  console.log(
                    "parentBone absolute position: ",
                    roundVector3(parentBone.getAbsolutePosition(), 4)
                  );
                }
              }
            }
          }
        });
        innerGizmoManager.onAttachedToNodeObservable.add((transformNode) => {
          if (transformNode) {
            const linkedBone = scene.getBoneByName(transformNode.name);
            if (linkedBone) {
              const linkedController = scene.getMeshByName(
                `${linkedBone.name}_Ctrl`
              );
              if (linkedController) {
                console.log("------------------------------------------");
                console.log("bone name: ", linkedBone.name);
                console.log(
                  "controller local position: ",
                  roundVector3(linkedController.position, 4)
                );
                console.log(
                  "controller absolute position: ",
                  roundVector3(linkedController.absolutePosition, 4)
                );
                console.log(
                  "bone local position: ",
                  roundVector3(linkedBone.getPosition(BABYLON.Space.LOCAL), 4)
                );
                console.log(
                  "bone world position: ",
                  roundVector3(linkedBone.getPosition(BABYLON.Space.WORLD), 4)
                );
                console.log(
                  "bone absolute position: ",
                  roundVector3(linkedBone.getAbsolutePosition(), 4)
                );
                const parentController = linkedController.parent as BABYLON.Mesh;
                const parentBone = linkedBone.getParent() as BABYLON.Bone;
                if (parentController && parentBone) {
                  console.log("------------------------------------------");
                  console.log("parentBone name: ", parentBone.name);
                  console.log(
                    "parentController local position: ",
                    roundVector3(parentController.position, 4)
                  );
                  console.log(
                    "parentController absolute position: ",
                    roundVector3(parentController.absolutePosition, 4)
                  );
                  console.log(
                    "parentBone local position: ",
                    roundVector3(parentBone.getPosition(BABYLON.Space.LOCAL), 4)
                  );
                  console.log(
                    "parentBone world position: ",
                    roundVector3(parentBone.getPosition(BABYLON.Space.WORLD), 4)
                  );
                  console.log(
                    "parentBone absolute position: ",
                    roundVector3(parentBone.getAbsolutePosition(), 4)
                  );
                }
              }
            }
          }
        });
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

  // unused lines
  // ----------------------------------------------------------------------------------------
  // const addAssetsToScene = useCallback(
  //   (assetContainer: BABYLON.AssetContainer, scene: BABYLON.Scene) => {
  //     const {
  //       animationGroups,
  //       geometries,
  //       materials,
  //       meshes,
  //       textures,
  //       skeletons,
  //       transformNodes,
  //     } = assetContainer;

  //     // primary data : animationGroups, meshes, skeletons, transformNodes
  //     if (animationGroups.length !== 0) {
  //       animationGroups.forEach((animationGroup) => {
  //         animationGroup.pause();
  //         animationGroup.goToFrame(0);
  //         scene.addAnimationGroup(animationGroup);
  //       });
  //     }

  //     if (meshes.length !== 0) {
  //       meshes.forEach((mesh) => {
  //         if (
  //           renderingCanvas.current &&
  //           renderingCanvas.current.id === "renderingCanvas2"
  //         ) {
  //           mesh.material = new BABYLON.StandardMaterial(
  //             "standardMaterial",
  //             scene
  //           );
  //         }
  //         mesh.isPickable = false;
  //         scene.addMesh(mesh);
  //       });
  //     }

  //     if (skeletons.length !== 0) {
  //       skeletons.forEach((skeleton) => {
  //         scene.addSkeleton(skeleton);
  //       });

  //       // add skeleton viewer
  //       const skeletonViewer = new BABYLON.SkeletonViewer(
  //         skeletons[0],
  //         meshes[0],
  //         scene,
  //         true,
  //         meshes[0].renderingGroupId + 1,
  //         SKELETON_VIEWER_OPTION
  //       );
  //       skeletonViewer.isEnabled = true; // should set initially because of the babylon bug

  //       // add joint spheres
  //       skeletons[0].bones.forEach((bone, idx) => {
  //         if (!bone.name.toLowerCase().includes("scene")) {
  //           const jointSphere = BABYLON.MeshBuilder.CreateSphere(
  //             "jointSphere",
  //             { diameter: 3 },
  //             scene
  //           );
  //           jointSphere.renderingGroupId = 3;
  //           jointSphere.attachToBone(bone, meshes[0]);

  //           // manage joint sphere actions
  //           jointSphere.actionManager = new BABYLON.ActionManager(scene);
  //           jointSphere.actionManager.registerAction(
  //             new BABYLON.ExecuteCodeAction(
  //               BABYLON.ActionManager.OnPickDownTrigger,
  //               (event) => {
  //                 setCurrentGizmoTarget(bone.getTransformNode());
  //               }
  //             )
  //           );
  //           jointSphere.actionManager.registerAction(
  //             new BABYLON.ExecuteCodeAction(
  //               BABYLON.ActionManager.OnPointerOverTrigger,
  //               () => {
  //                 scene.hoverCursor = "pointer";
  //               }
  //             )
  //           );
  //           jointSphere.actionManager.registerAction(
  //             new BABYLON.ExecuteCodeAction(
  //               BABYLON.ActionManager.OnPointerOutTrigger,
  //               () => {
  //                 scene.hoverCursor = "default";
  //               }
  //             )
  //           );
  //         }
  //       });
  //     }

  //     transformNodes.forEach((transformNode) => {
  //       scene.addTransformNode(transformNode);
  //     });

  //     // secondary data : geometries, materials, textures
  //     geometries.forEach((geometry) => {
  //       scene.addGeometry(geometry);
  //     });
  //     materials.forEach((material) => {
  //       scene.addMaterial(material);
  //     });
  //     textures.forEach((texture) => {
  //       scene.addTexture(texture);
  //     });
  //   },
  //   [renderingCanvas, setCurrentGizmoTarget]
  // );
  // ----------------------------------------------------------------------------------------

  // when gizmo target changed
  useEffect(() => {
    if (gizmoManger && currentGizmoTarget) {
      // attach gizmo
      if (currentGizmoTarget.getClassName() === "TransformNode") {
        if (
          !gizmoManger.positionGizmoEnabled &&
          !gizmoManger.rotationGizmoEnabled &&
          !gizmoManger.scaleGizmoEnabled
        ) {
          gizmoManger.positionGizmoEnabled = true;
        }
        gizmoManger.attachToNode(currentGizmoTarget);
      } else if (currentGizmoTarget.getClassName() === "Mesh") {
        if (
          !gizmoManger.positionGizmoEnabled &&
          !gizmoManger.rotationGizmoEnabled &&
          !gizmoManger.scaleGizmoEnabled
        ) {
          gizmoManger.positionGizmoEnabled = true;
        }
        gizmoManger.attachToMesh(currentGizmoTarget as BABYLON.Mesh);
      }
    }
  }, [currentGizmoTarget, gizmoManger]);

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
        // addAssetsToScene(loadedAssetContainer, scene);
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
        // addAssetsToScene(loadedAssetContainer, scene);
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
            gizmoManger.positionGizmoEnabled = true;
            gizmoManger.rotationGizmoEnabled = false;
            gizmoManger.scaleGizmoEnabled = false;
            break;
          }
          case "e":
          case "E":
          case "ㄷ": {
            gizmoManger.positionGizmoEnabled = false;
            gizmoManger.rotationGizmoEnabled = true;
            gizmoManger.scaleGizmoEnabled = false;
            break;
          }
          case "r":
          case "R":
          case "ㄱ": {
            gizmoManger.positionGizmoEnabled = false;
            gizmoManger.rotationGizmoEnabled = false;
            gizmoManger.scaleGizmoEnabled = true;
            break;
          }
          case "Escape": {
            gizmoManger.positionGizmoEnabled = false;
            gizmoManger.rotationGizmoEnabled = false;
            gizmoManger.scaleGizmoEnabled = false;
            gizmoManger.attachToNode(null);
            setCurrentGizmoTarget(null);
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
  }, [gizmoManger, setCurrentGizmoTarget]);

  return {};
};

export default useRendering;
