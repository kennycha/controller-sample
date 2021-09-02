type ScalingDragCallback = () => void;

const getScalingDragCallback: () => ScalingDragCallback = () => {
  return () => {};
};

export default getScalingDragCallback;
