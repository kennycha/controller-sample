import { ModelAssetsAction } from "../actions/modelAssets";
import { ShootAssetContainer } from "../types";

type ModelAssetsState = ShootAssetContainer[];

const defaultState: ModelAssetsState = [];

export const modelAssets = (
  state = defaultState,
  action: ModelAssetsAction
) => {
  switch (action.type) {
    case "modelAssets/LOAD_MODEL_ASSETS": {
      return [...state, action.payload.newContainer];
    }
    case "modelAssets/UPDATE_MODEL_ASSETS": {
      const targetIndex = state.findIndex(
        (container) => container.id === action.payload.id
      );
      if (targetIndex === -1) {
        return state;
      }
      return [
        ...state.slice(0, targetIndex),
        action.payload.updatedContainer,
        ...state.slice(targetIndex + 1),
      ];
    }
    case "modelAssets/DELETE_MODEL_ASSETS": {
      return state.filter((container) => container.id !== action.payload.id);
    }
    default: {
      return state;
    }
  }
};
