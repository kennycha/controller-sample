import * as BABYLON from "@babylonjs/core";

const roundVector3 = (quaternion: BABYLON.Quaternion, decimal: number) => {
  return new BABYLON.Quaternion(
    Math.round(quaternion.x * Math.pow(10, decimal)) / Math.pow(10, decimal),
    Math.round(quaternion.y * Math.pow(10, decimal)) / Math.pow(10, decimal),
    Math.round(quaternion.z * Math.pow(10, decimal)) / Math.pow(10, decimal),
    Math.round(quaternion.w * Math.pow(10, decimal)) / Math.pow(10, decimal)
  );
};

export default roundVector3;
