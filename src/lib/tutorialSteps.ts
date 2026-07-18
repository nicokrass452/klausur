import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpenText,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Settings2,
  Sparkles,
  Trophy
} from "lucide-react";
import { ROUTES } from "./constants";

export interface TutorialCopy {
  title: string;
  summary: string;
  action: string;
  why: string;
}

export interface TutorialStep {
  id: string;
  route: string;
  target?: string;
  icon: LucideIcon;
  de: TutorialCopy;
  en: TutorialCopy;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    route: ROUTES.dashboard,
    icon: Trophy,
    de: {
      title: "Willkommen – wir richten deinen Lernalltag ein",
      summary: "Diese kurze Tour zeigt dir die echten Bedienelemente. Die Seite bleibt sichtbar, damit du sofort weißt, wo du später klicken musst.",
      action: "Klicke auf „Tour starten“. Danach führen wir dich durch die wichtigsten Bereiche.",
      why: "Du kannst die Tour jederzeit mit Esc verlassen und in den Einstellungen neu starten."
    },
    en: {
      title: "Welcome — let’s set up your study routine",
      summary: "This short tour points to the real controls. The page stays visible so you know exactly where to click later.",
      action: "Select “Start tour”. We’ll then guide you through the essential areas.",
      why: "Press Esc to leave at any time and restart the tour later in Settings."
    }
  },
  {
    id: "dashboard",
    route: ROUTES.dashboard,
    target: "[data-tour='dashboard-overview']",
    icon: LayoutDashboard,
    de: {
      title: "Dein nächster sinnvoller Schritt",
      summary: "Das Dashboard beginnt mit deiner nächsten Klausur, dem Countdown und zwei direkten Aktionen.",
      action: "Prüfe zuerst den Countdown. Mit „Klausuren verwalten“ änderst du den Termin, mit „Fokus starten“ beginnst du sofort zu lernen.",
      why: "So musst du nicht jeden Bereich durchsuchen, bevor du mit der wichtigsten Aufgabe startest."
    },
    en: {
      title: "Your next useful step",
      summary: "The dashboard starts with your next exam, its countdown, and two direct actions.",
      action: "Check the countdown first. Use “Manage exams” to edit it or “Start focus” to begin studying now.",
      why: "This keeps your most important next action one click away."
    }
  },
  {
    id: "exams",
    route: ROUTES.exams,
    target: "[data-tour='exam-form']",
    icon: BookOpenText,
    de: {
      title: "Eine Klausur ist der Startpunkt",
      summary: "Aus Datum, Schwierigkeit, Wissensstand und täglicher Lernzeit baut die App deinen Lernplan.",
      action: "Trage Fach und Datum ein. Schätze Schwierigkeit und Wissen ehrlich ein und speichere anschließend.",
      why: "Je genauer diese Angaben sind, desto sinnvoller verteilt der Plan deine Lernzeit."
    },
    en: {
      title: "An exam is your starting point",
      summary: "The app builds your study plan from the date, difficulty, knowledge level, and daily time.",
      action: "Enter a subject and date, rate difficulty and knowledge honestly, then save.",
      why: "Better input produces a more useful study schedule."
    }
  },
  {
    id: "study-plan",
    route: ROUTES.studyPlan,
    target: "[data-tour='study-plan-actions']",
    icon: Sparkles,
    de: {
      title: "Hier wird aus dem Ziel ein Tagesplan",
      summary: "Offene Aufgaben werden über die verbleibenden Tage verteilt und Wiederholungen eingeplant.",
      action: "Arbeite die Aufgaben von oben nach unten ab. Wenn du zurückfällst, nutze „Verpasste neu verteilen“.",
      why: "Erledigte Aufgaben bringen XP; Neuverteilung hält den Plan realistisch statt überladen."
    },
    en: {
      title: "Turn your goal into a daily plan",
      summary: "Open tasks are spread across the remaining days with reviews scheduled in between.",
      action: "Work through tasks from top to bottom. If you fall behind, use “Redistribute missed”.",
      why: "Completed tasks earn XP, while redistribution keeps the plan realistic."
    }
  },
  {
    id: "calendar",
    route: ROUTES.calendar,
    target: "[data-tour='calendar-controls']",
    icon: CalendarDays,
    de: {
      title: "Termine im Zusammenhang sehen",
      summary: "Der Kalender zeigt, wie nah Klausuren beieinanderliegen und welche Wochen besonders voll sind.",
      action: "Wechsle zwischen Woche für den Nahbereich und Monat für die langfristige Planung.",
      why: "So erkennst du frühzeitig, wann mehrere Fächer gleichzeitig Aufmerksamkeit brauchen."
    },
    en: {
      title: "See dates in context",
      summary: "The calendar reveals exam clusters and especially busy weeks.",
      action: "Use Week for the near term and Month for longer-range planning.",
      why: "You can spot early when several subjects will compete for your attention."
    }
  },
  {
    id: "coach",
    route: ROUTES.coach,
    target: "[data-tour='coach-workspace']",
    icon: Bot,
    de: {
      title: "Der Coach arbeitet mit deinen Daten",
      summary: "Wähle links Coach, Quiz, Flashcards, Plan oder Erklären. Der Chat kennt deine aktiven Klausuren und Themen.",
      action: "Wähle einen Modus und stelle unten eine konkrete Frage, zum Beispiel: „Teste mich zu meinen offenen Biologie-Themen.“",
      why: "Konkrete Fragen und der passende Modus liefern deutlich nützlichere Antworten."
    },
    en: {
      title: "The coach uses your study context",
      summary: "Choose Coach, Quiz, Flashcards, Plan, or Explain. The chat knows your active exams and topics.",
      action: "Pick a mode and ask a specific question, such as: “Quiz me on my open biology topics.”",
      why: "A clear request in the right mode produces much more useful answers."
    }
  },
  {
    id: "focus",
    route: ROUTES.focus,
    target: "[data-tour='focus-timer']",
    icon: Clock3,
    de: {
      title: "Lernen in überschaubaren Einheiten",
      summary: "Der Fokusmodus trennt konzentrierte Lernzeit und Pausen und protokolliert abgeschlossene Einheiten.",
      action: "Starte eine 25-Minuten-Einheit, bearbeite genau eine Aufgabe und mache danach die vorgeschlagene Pause.",
      why: "Ein klares Zeitfenster senkt die Einstiegshürde und macht deinen Fortschritt messbar."
    },
    en: {
      title: "Study in manageable sessions",
      summary: "Focus mode separates concentrated study from breaks and records completed sessions.",
      action: "Start a 25-minute session, work on one task only, then take the suggested break.",
      why: "A fixed time box makes starting easier and turns effort into measurable progress."
    }
  },
  {
    id: "analytics",
    route: ROUTES.analytics,
    target: "[data-tour='analytics-overview']",
    icon: BarChart3,
    de: {
      title: "Fortschritt richtig lesen",
      summary: "Lernzeit, XP bis zum nächsten Level und dein schwächstes Fach zeigen nicht nur Aktivität, sondern auch Prioritäten.",
      action: "Sieh zuerst auf das schwächste Fach und plane dort die nächste Aufgabe ein.",
      why: "Analytics helfen dir nur dann, wenn daraus eine konkrete nächste Entscheidung entsteht."
    },
    en: {
      title: "Read your progress correctly",
      summary: "Study time, XP to the next level, and your weakest subject show both activity and priorities.",
      action: "Check the weakest subject first and schedule your next task there.",
      why: "Analytics matter when they lead to a concrete next decision."
    }
  },
  {
    id: "settings",
    route: ROUTES.settings,
    target: "[data-tour='settings-preferences']",
    icon: Settings2,
    de: {
      title: "Passe die App an deinen Alltag an",
      summary: "In den Einstellungen änderst du Darstellung, Erinnerungen, tägliche Lernzeit und Synchronisierung.",
      action: "Stelle als Erstes deine realistische tägliche Lernzeit ein und aktiviere nur Erinnerungen, die dir wirklich helfen.",
      why: "Eine machbare Vorgabe ist besser als ein perfekter Plan, den du nicht einhalten kannst."
    },
    en: {
      title: "Fit the app to your routine",
      summary: "Settings control appearance, reminders, daily study time, and synchronization.",
      action: "Set a realistic daily study time first, then enable only reminders that genuinely help.",
      why: "A sustainable target beats a perfect plan you cannot follow."
    }
  },
  {
    id: "finish",
    route: ROUTES.dashboard,
    icon: CheckCircle2,
    de: {
      title: "Du bist bereit",
      summary: "Dein Ablauf ist: Klausur anlegen, Tagesaufgaben bearbeiten, Fokuszeit nutzen und den Plan regelmäßig prüfen.",
      action: "Beende die Tour und lege als Nächstes deine erste echte Klausur an.",
      why: "Die Einführung kannst du später jederzeit in den Einstellungen erneut starten."
    },
    en: {
      title: "You’re ready",
      summary: "Your workflow is: create an exam, complete daily tasks, use focus sessions, and review the plan regularly.",
      action: "Finish the tour, then create your first real exam.",
      why: "You can restart this tutorial from Settings at any time."
    }
  }
];
