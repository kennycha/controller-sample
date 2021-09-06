import * as BABYLON from "@babylonjs/core";

const addOutlineToMesh = (
  target: BABYLON.Mesh,
  color: BABYLON.Color3,
  width: number
) => {
  target.renderOutline = true;
  target.outlineColor = color;
  target.outlineWidth = width;
};

export default addOutlineToMesh;
