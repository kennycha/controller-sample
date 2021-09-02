type RotationDragCallback = () => void;

const getRotationDragCallback: () => RotationDragCallback = () => {
  return () => {};
};

export default getRotationDragCallback;
