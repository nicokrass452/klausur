import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ROUTES } from "../lib/constants";
import { isPublicRoute } from "../lib/navigation";
import { useAppStore } from "../store/useAppStore";

export function AuthGuard() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated && !isPublicRoute(location.pathname)) {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}