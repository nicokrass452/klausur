import { useAppStore } from "../store/useAppStore";

export function useHydratedStore(): boolean {
  return useAppStore((state) => state.hasHydrated);
}
