import { createContext, useContext } from "react";

// Context crosses Radix portals without changing body classes or public forms.
export const AdminAppearanceContext = createContext(false);

export function useAdminAppearanceClassName() {
  return useContext(AdminAppearanceContext) ? "admin-ui" : undefined;
}
