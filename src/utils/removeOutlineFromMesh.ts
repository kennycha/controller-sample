import * as BABYLON from "@babylonjs/core";

const removeOutlineFromMesh = (target: BABYLON.Mesh) => {
  target.renderOutline = false;
};

export default removeOutlineFromMesh;
