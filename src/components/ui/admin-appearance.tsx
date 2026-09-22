import { type PropsWithChildren } from "react";
import { AdminAppearanceContext } from "./admin-appearance-context";

export function AdminAppearanceProvider({ children }: PropsWithChildren) {
  return <AdminAppearanceContext.Provider value>{children}</AdminAppearanceContext.Provider>;
}
