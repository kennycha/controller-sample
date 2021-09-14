import * as BABYLON from "@babylonjs/core";

const downloadSkeletonAsJson = (
  targetSkeleton: BABYLON.Skeleton,
  exportName: string
) => {
  const serializedSkeleton = targetSkeleton.serialize();
  const strSkeleton = JSON.stringify(serializedSkeleton);
  const blob = new Blob([strSkeleton], { type: "octet/stream" });
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${exportName}.json`;
  link.click();

  URL.revokeObjectURL(objectUrl);
  link.remove();
};

export default downloadSkeletonAsJson;
