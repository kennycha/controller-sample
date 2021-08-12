import { RefObject, useEffect, useState } from "react";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { convertFbxToGlb, getFileExtension } from "../utils";

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

const useRendering = (
  currentFile: File | null,
  renderingCanvas: RefObject<HTMLCanvasElement>
) => {
  const [scene, setScene] = useState<BABYLON.Scene | null>(null);
  const [gizmoManger, setGizmoManager] = useState<BABYLON.GizmoManager | null>(
    null
  );
  const [currentGizmoTarget, setCurrentGizmoTarget] = useState<
    BABYLON.TransformNode | BABYLON.Mesh | null
  >(null);

  // initial setting
  useEffect(() => {
    const handleSceneReady = (scene: BABYLON.Scene) => {
      if (renderingCanvas.current) {
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
            console.log(`attached to mesh: ${mesh.name}`);
          }
        });
        innerGizmoManager.onAttachedToNodeObservable.add((transformNode) => {
          if (transformNode) {
            console.log(`attached to transformNode: ${transformNode.name}`);
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

  const addAssetsToScene = (
    assetContainer: BABYLON.AssetContainer,
    scene: BABYLON.Scene
  ) => {
    const {
      animationGroups,
      geometries,
      materials,
      meshes,
      textures,
      skeletons,
      transformNodes,
    } = assetContainer;

    // primary data : animationGroups, meshes, skeletons, transformNodes
    if (animationGroups.length !== 0) {
      animationGroups.forEach((animationGroup) => {
        animationGroup.pause();
        scene.addAnimationGroup(animationGroup);
      });
    }

    if (meshes.length !== 0) {
      meshes.forEach((mesh) => {
        mesh.isPickable = false;
        scene.addMesh(mesh);
      });
    }

    if (skeletons.length !== 0) {
      skeletons.forEach((skeleton) => {
        scene.addSkeleton(skeleton);
      });

      // add skeleton viewer
      const skeletonViewer = new BABYLON.SkeletonViewer(
        skeletons[0],
        meshes[0],
        scene,
        true,
        meshes[0].renderingGroupId + 1,
        SKELETON_VIEWER_OPTION
      );
      skeletonViewer.isEnabled = true; // should set initially because of the babylon bug

      // add joint spheres
      skeletons[0].bones.forEach((bone, idx) => {
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
    }

    transformNodes.forEach((transformNode) => {
      scene.addTransformNode(transformNode);
    });

    // secondary data : geometries, materials, textures
    geometries.forEach((geometry) => {
      scene.addGeometry(geometry);
    });
    materials.forEach((material) => {
      scene.addMaterial(material);
    });
    textures.forEach((texture) => {
      scene.addTexture(texture);
    });
  };

  useEffect(() => {
    if (gizmoManger && currentGizmoTarget) {
      // attach gizmo
      if (currentGizmoTarget.getClassName() === "TransformNode") {
        gizmoManger.attachToNode(currentGizmoTarget);
      } else if (currentGizmoTarget.getClassName() === "Mesh") {
        gizmoManger.attachToMesh(currentGizmoTarget as BABYLON.Mesh);
      }
    }
  }, [currentGizmoTarget, gizmoManger]);

  // when new file is dropped
  useEffect(() => {
    const loadFbxFile = async (file: File, scene: BABYLON.Scene) => {
      const glbFileUrl = await convertFbxToGlb(file)
        .then((res) => res)
        .catch((err) => alert(err));
      const loadedAssetContainer = await BABYLON.SceneLoader.LoadAssetContainerAsync(
        glbFileUrl,
        "",
        scene
      );
      addAssetsToScene(loadedAssetContainer, scene);
    };

    const loadGlbFile = async (file: unknown, scene: BABYLON.Scene) => {
      const loadedAssetContainer = await BABYLON.SceneLoader.LoadAssetContainerAsync(
        "file:",
        file as string, // error without type assertion
        scene
      );
      addAssetsToScene(loadedAssetContainer, scene);
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
  }, [currentFile, scene]);

  // manage gizmo shortcut
  useEffect(() => {
    if (gizmoManger) {
      const handleKeyDown = (event: KeyboardEvent) => {
        console.log(event.key);
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
  }, [gizmoManger]);
};

export default useRendering;
