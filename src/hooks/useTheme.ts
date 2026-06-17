import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

export function useTheme(): void {
  const theme = useAppStore((state) => state.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    root.dataset.theme = resolved;
  }, [theme]);
}
