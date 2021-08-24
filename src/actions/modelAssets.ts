import { ShootAssetContainer } from "../types";

export type ModelAssetsAction =
  | ReturnType<typeof loadModelAssets>
  | ReturnType<typeof updateModelAssets>
  | ReturnType<typeof deleteModelAssets>;

export const LOAD_MODEL_ASSETS = "modelAssets/LOAD_MODEL_ASSETS" as const;
export const UPDATE_MODEL_ASSETS = "modelAssets/UPDATE_MODEL_ASSETS" as const;
export const DELETE_MODEL_ASSETS = "modelAssets/DELETE_MODEL_ASSETS" as const;

type LoadModelAssets = {
  newContainer: ShootAssetContainer;
};

export const loadModelAssets = (params: LoadModelAssets) => ({
  type: LOAD_MODEL_ASSETS,
  payload: {
    ...params,
  },
});

interface UpdateModelAssets {
  id: string;
  updatedContainer: ShootAssetContainer;
}

export const updateModelAssets = (params: UpdateModelAssets) => ({
  type: UPDATE_MODEL_ASSETS,
  payload: {
    ...params,
  },
});

interface DeleteModelAssets {
  id: string;
}

export const deleteModelAssets = (params: DeleteModelAssets) => ({
  type: DELETE_MODEL_ASSETS,
  payload: {
    ...params,
  },
});
