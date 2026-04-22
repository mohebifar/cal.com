import { createContext, use } from "react";

export const ApiKeyContext = createContext({ key: "", error: "" });

export const useApiKey = () => use(ApiKeyContext);
