import * as BABYLON from "@babylonjs/core";

type ScreenXY = { x: number; y: number };

const checkIsIncluded = (
  startPoint: ScreenXY,
  endPoint: ScreenXY,
  targetPosition: BABYLON.Vector3,
  scene: BABYLON.Scene
) => {
  const targetScreenPosition = BABYLON.Vector3.Project(
    targetPosition,
    BABYLON.Matrix.IdentityReadOnly,
    scene.getTransformMatrix(),
    scene.activeCamera!.viewport.toGlobal(
      scene.getEngine().getRenderWidth(),
      scene.getEngine().getRenderHeight()
    )
  );

  const minX = Math.min(startPoint.x, endPoint.x);
  const minY = Math.min(startPoint.y, endPoint.y);
  const maxX = Math.max(startPoint.x, endPoint.x);
  const maxY = Math.max(startPoint.y, endPoint.y);

  if (
    targetScreenPosition.x >= minX &&
    targetScreenPosition.x <= maxX &&
    targetScreenPosition.y >= minY &&
    targetScreenPosition.y <= maxY
  ) {
    return true;
  }
  return false;
};

export default checkIsIncluded;
