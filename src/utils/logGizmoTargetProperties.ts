import * as BABYLON from "@babylonjs/core";
import roundVector3 from "./roundVector3";

const logGizmoTargetProperties = (
  target: BABYLON.TransformNode | BABYLON.Mesh,
  type: "transformNode" | "controller",
  scene: BABYLON.Scene
) => {
  if (type === "transformNode") {
    const linkedBone = scene.getBoneByName(target.name);
    if (linkedBone) {
      const linkedController = scene.getMeshByName(`${linkedBone.name}_Ctrl`);
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
  } else if (type === "controller") {
    const linkedBone = scene.skeletons[0].bones.find(
      (bone) => bone.uniqueId === parseInt(target.state)
    );
    if (linkedBone) {
      console.log("------------------------------------------");
      console.log("bone name: ", linkedBone.name);
      console.log(
        "controller local position: ",
        roundVector3(target.position, 4)
      );
      console.log(
        "controller absolute position: ",
        roundVector3(target.absolutePosition, 4)
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
      const parentController = target.parent as BABYLON.Mesh;
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
};

export default logGizmoTargetProperties;
