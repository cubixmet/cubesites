import { useSyncExternalStore } from "react";
import { store } from "@/mock/store";
import { authService } from "@/services/auth";
import type { DemoDB, User } from "@/types";

/** Reactive snapshot of the mock data source. Read via service query functions. */
export const useDb = (): DemoDB => useSyncExternalStore(store.subscribe, store.get, store.get);

export const useCurrentUser = (): User | null => {
  useDb();
  useSyncExternalStore(authService.subscribe, authService.session, () => null);
  return authService.currentUser();
};
