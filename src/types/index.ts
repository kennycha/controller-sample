import * as BABYLON from "@babylonjs/core";

interface TransformKey {
  frame: number;
  value: BABYLON.Vector3;
}

interface IkConstraintKey {
  frame: number;
}

interface FkConstraintKey {
  frame: number;
}

interface FilterData {
  isApplied: boolean;
  params?: {
    beta: number;
    minCutoff: number;
  };
}

export interface ShootMotionIngredient {
  layerId: string;
  boneUniqueId: number;
  transformKeys: {
    positionTransform: TransformKey[];
    rotationTransform: TransformKey[];
    scaleTransform: TransformKey[];
  };
  constraintKeys: {
    ikConstraint: IkConstraintKey[];
    fkConstraint: FkConstraintKey[];
  };
  filterData: {
    positionFilter: FilterData;
    rotationFilter: FilterData;
  };
}

export interface ShootMotion {
  id: string;
  assetContainerId: string;
  animationGroupUniqueId: number;
  motionIngredients: ShootMotionIngredient[];
  layerIds: string[];
  boneUniqueIds: number[];
}

export interface ShootAssetContainer {
  id: string;
  fileName: string;
  animationGroups: BABYLON.AnimationGroup[];
  meshes: BABYLON.AbstractMesh[];
  skeleton: BABYLON.Skeleton;
  transformNodes: BABYLON.TransformNode[];
}
