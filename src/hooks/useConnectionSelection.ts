import { useSyncExternalStore } from "react";
import { workspace, ConnectionSelection } from "../providers/index.ts";

// Re-renders when the broker switches email/calendar or files provider.
export function useConnectionSelection(): ConnectionSelection {
  return useSyncExternalStore(
    (onChange) => workspace.onSelectionChange(() => onChange()),
    () => workspace.selection
  );
}
