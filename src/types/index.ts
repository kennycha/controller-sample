import * as BABYLON from "@babylonjs/core";

type Vector3OrNumber = BABYLON.Vector3 | number;

export interface TransformKey<T extends Vector3OrNumber> {
  frame: number;
  value: T;
}

export interface ShootMotionIngredient {
  id: string;
  layerId: string;
  boneUniqueId: number;
  transformKeys: {
    position: {
      x: TransformKey<number>[];
      y: TransformKey<number>[];
      z: TransformKey<number>[];
    };
    rotation: {
      x: TransformKey<number>[];
      y: TransformKey<number>[];
      z: TransformKey<number>[];
    };
    scale: {
      x: TransformKey<number>[];
      y: TransformKey<number>[];
      z: TransformKey<number>[];
    };
  };
}

export interface ShootMotion {
  id: string;
  assetContainerId: string;
  animationGroupUniqueId: number;
  layerIds: string[];
  boneUniqueIds: number[];
  controllerUniqueIds: number[];
  motionIngredients: ShootMotionIngredient[];
}

export interface ShootAssetContainer {
  id: string;
  fileName: string;
  animationGroups: BABYLON.AnimationGroup[];
  meshes: BABYLON.AbstractMesh[];
  skeleton: BABYLON.Skeleton;
  transformNodes: BABYLON.TransformNode[];
  controllers: BABYLON.Mesh[];
}
