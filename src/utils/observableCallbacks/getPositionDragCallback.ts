type PositionDragCallback = () => void;

const getPositionDragCallback: () => PositionDragCallback = () => {
  return () => {};
};

export default getPositionDragCallback;
