import { LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../lib/constants";
import { useAppStore } from "../store/useAppStore";

export function AuthButton() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => navigate(ROUTES.login)}
        className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200"
      >
        <LogIn size={16} />
        Login
      </button>
    );
  }

  return (
    <button
      onClick={async () => {
        await logout();
        navigate(ROUTES.login, { replace: true });
      }}
      className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200"
    >
      <LogOut size={16} />
      {user?.fullName ?? user?.email ?? "Logout"}
    </button>
  );
}
