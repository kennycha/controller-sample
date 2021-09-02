type ScalingStartDragCallback = () => void;

const getScalingStartDragCallback: () => ScalingStartDragCallback = () => {
  return () => {};
};

export default getScalingStartDragCallback;
