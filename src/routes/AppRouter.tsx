import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLoader } from "../components/AppLoader";
import { AuthGuard } from "../components/AuthGuard";
import { Layout } from "../components/Layout";
import { ROUTES } from "../lib/constants";
import { useAppStore } from "../store/useAppStore";

const DashboardPage = lazy(() => import("../pages/Dashboard").then((module) => ({ default: module.DashboardPage })));
const CalendarPage = lazy(() => import("../pages/Calendar").then((module) => ({ default: module.CalendarPage })));
const ExamsPage = lazy(() => import("../pages/Exams").then((module) => ({ default: module.ExamsPage })));
const ExamDetailPage = lazy(() => import("../pages/ExamDetail").then((module) => ({ default: module.ExamDetailPage })));
const CoachPage = lazy(() => import("../pages/Coach").then((module) => ({ default: module.CoachPage })));
const StudyPlanPage = lazy(() => import("../pages/StudyPlan").then((module) => ({ default: module.StudyPlanPage })));
const FocusModePage = lazy(() => import("../pages/FocusMode").then((module) => ({ default: module.FocusModePage })));
const AnalyticsPage = lazy(() => import("../pages/Analytics").then((module) => ({ default: module.AnalyticsPage })));
const SettingsPage = lazy(() => import("../pages/Settings").then((module) => ({ default: module.SettingsPage })));
const LoginPage = lazy(() => import("../pages/Login").then((module) => ({ default: module.LoginPage })));

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<AppLoader />}>{element}</Suspense>;
}

function HomeRedirect() {
  const authReady = useAppStore((state) => state.authReady);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  if (!authReady) return null;
  return <Navigate to={isAuthenticated ? ROUTES.dashboard : ROUTES.signup} replace />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path={ROUTES.login} element={withSuspense(<LoginPage mode="login" />)} />
      <Route path={ROUTES.signup} element={withSuspense(<LoginPage mode="signup" />)} />
      <Route element={<AuthGuard />}>
        <Route element={<Layout />}>
          <Route path={ROUTES.dashboard} element={withSuspense(<DashboardPage />)} />
          <Route path={ROUTES.calendar} element={withSuspense(<CalendarPage />)} />
          <Route path={ROUTES.exams} element={withSuspense(<ExamsPage />)} />
          <Route path={`${ROUTES.exams}/:id`} element={withSuspense(<ExamDetailPage />)} />
          <Route path={ROUTES.coach} element={withSuspense(<CoachPage />)} />
          <Route path={ROUTES.studyPlan} element={withSuspense(<StudyPlanPage />)} />
          <Route path={ROUTES.focus} element={withSuspense(<FocusModePage />)} />
          <Route path={ROUTES.analytics} element={withSuspense(<AnalyticsPage />)} />
          <Route path={ROUTES.settings} element={withSuspense(<SettingsPage />)} />
        </Route>
      </Route>
    </Routes>
  );
}