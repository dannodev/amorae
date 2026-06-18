import { useContext } from "react";
import { AppContext } from "./AppContextCore";

export const useAppContext = () => useContext(AppContext);
