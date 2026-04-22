import { use } from "react";

import { WebPushContext } from "../components/WebPushContext";

export function useWebPush() {
  const context = use(WebPushContext);
  if (!context) {
    throw new Error("useWebPush must be used within a WebPushProvider");
  }
  return context;
}
