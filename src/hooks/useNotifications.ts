import { useEffect } from "react";
import { syncNotificationSchedule } from "../services/notificationService";
import { useAppStore } from "../store/useAppStore";

export function useNotifications(): void {
  const exams = useAppStore((state) => state.exams);
  const studyTasks = useAppStore((state) => state.studyTasks);
  const settings = useAppStore((state) => state.settings);

  useEffect(() => {
    syncNotificationSchedule(exams, studyTasks, settings);
  }, [exams, studyTasks, settings]);
}
