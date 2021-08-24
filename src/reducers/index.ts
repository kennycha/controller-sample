import {
  TypedUseSelectorHook,
  useSelector as useReduxSelector,
} from "react-redux";
import { combineReducers } from "redux";
import { modelAssets } from "./modelAssets";

export type RootState = ReturnType<typeof rootReducer>;

const rootReducer = combineReducers({
  modelAssets,
});

export const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;

export default rootReducer;
