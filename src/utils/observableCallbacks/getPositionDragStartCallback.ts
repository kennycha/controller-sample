type PositionDragStartCallback = () => void;

const getPositionDragStartCallback: () => PositionDragStartCallback = () => {
  return () => {};
};

export default getPositionDragStartCallback;
