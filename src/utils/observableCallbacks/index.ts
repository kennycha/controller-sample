import getPositionDragCallback from "./getPositionDragCallback";
import getPositionDragStartCallback from "./getPositionDragStartCallback";
import getRotationDragCallback from "./getRotationDragCallback";
import getRotationDragStartCallback from "./getRotationDragStartCallback";
import getScalingDragCallback from "./getScalingDragCallback";
import getScalingDragStartCallback from "./getScalingDragStartCallback";

const observableCallbacks = {
  getPositionDragCallback,
  getPositionDragStartCallback,
  getRotationDragCallback,
  getRotationDragStartCallback,
  getScalingDragCallback,
  getScalingDragStartCallback,
};

export default observableCallbacks;
