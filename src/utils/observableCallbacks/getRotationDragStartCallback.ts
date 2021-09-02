type RotationDragStartCallback = () => void;

const getRotationDragStartCallback: () => RotationDragStartCallback = () => {
  return () => {};
};

export default getRotationDragStartCallback;
