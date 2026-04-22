import { use } from "react";

import { DataTableContext } from "../DataTableProvider";

export function useDataTable() {
  const context = use(DataTableContext);
  if (!context) {
    throw new Error("useDataTable must be used within a DataTableProvider");
  }
  return context;
}
