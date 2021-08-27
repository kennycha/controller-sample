import * as BABYLON from "@babylonjs/core";

const roundVector3 = (vector: BABYLON.Vector3, decimal: number) => {
  return new BABYLON.Vector3(
    Math.round(vector.x * Math.pow(10, decimal)) / Math.pow(10, decimal),
    Math.round(vector.y * Math.pow(10, decimal)) / Math.pow(10, decimal),
    Math.round(vector.z * Math.pow(10, decimal)) / Math.pow(10, decimal)
  );
};

export default roundVector3;
