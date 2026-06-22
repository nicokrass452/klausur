import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpenText,
  Bot,
  CalendarDays,
  Clock3,
  Flame,
  LayoutDashboard,
  Settings2,
  Sparkles,
  Trophy
} from "lucide-react";
import { ROUTES } from "./constants";

export interface TutorialStep {
  id: string;
  route: string;
  title: string;
  summary: string;
  details: string[];
  icon: LucideIcon;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    route: ROUTES.dashboard,
    title: "Willkommen bei Klausurplaner",
    summary: "Dein persönlicher Lernplaner für Klausuren – online mit Cloud-Sync, KI-Coach und Gamification.",
    details: [
      "Diese Einführung zeigt dir alle Bereiche der App Schritt für Schritt.",
      "Du musst jeden Schritt durchklicken, bevor die App freigeschaltet wird.",
      "Ohne Login kannst du nur den Kalender ansehen – mit Account sind alle Funktionen aktiv."
    ],
    icon: Trophy
  },
  {
    id: "dashboard",
    route: ROUTES.dashboard,
    title: "Dashboard – dein Überblick",
    summary: "Hier siehst du Countdown, heutige Aufgaben, Streak und Fortschritt auf einen Blick.",
    details: [
      "Die große Karte zeigt deine nächste Klausur mit Countdown in Tagen.",
      "Der Lerncoach gibt dir täglich eine kurze Empfehlung basierend auf deinem Plan.",
      "Unter „Heute lernen“ findest du offene Aufgaben – abhaken bringt XP.",
      "Die Stat-Karten zeigen Streak, Fokuszeit und offene Aufgaben für heute."
    ],
    icon: LayoutDashboard
  },
  {
    id: "exams",
    route: ROUTES.exams,
    title: "Klausuren anlegen",
    summary: "Lege Fächer mit Datum, Schwierigkeit und Wissensstand an – der Lernplan wird automatisch erzeugt.",
    details: [
      "Trage Fach, Datum, Uhrzeit, Raum und tägliche Lernzeit ein.",
      "Schwierigkeit (1–5) und Wissensstand beeinflussen die Priorität im Lernplan.",
      "Nach dem Speichern öffnest du die Klausur für Themen, Material und KI-Hilfe.",
      "Jede Klausur bekommt eine eigene Farbe im Kalender."
    ],
    icon: BookOpenText
  },
  {
    id: "study-plan",
    route: ROUTES.studyPlan,
    title: "Lernplan mit Spaced Repetition",
    summary: "Aufgaben werden automatisch verteilt: 70 % lernen, 20 % wiederholen, 10 % Puffer.",
    details: [
      "Der Plan nutzt Intervalle an Tag 1, 2, 5, 10 und 18 für Wiederholungen.",
      "„Verpasste neu verteilen“ schiebt offene Aufgaben auf kommende Tage.",
      "KI-Plan optimieren, Quiz und Flashcards erzeugen Lernhilfen aus deinen Themen.",
      "Erledigte Aufgaben geben XP – verpasste kannst du markieren."
    ],
    icon: Sparkles
  },
  {
    id: "calendar",
    route: ROUTES.calendar,
    title: "Kalender",
    summary: "Sieh Klausuren in Wochen- oder Monatsansicht mit Fachfarben.",
    details: [
      "Wechsle oben zwischen Woche und Monat.",
      "Jede Klausur erscheint am Prüfungstag in der Fachfarbe.",
      "Nutze den Kalender, um Lernphasen und Prüfungstermine zu planen."
    ],
    icon: CalendarDays
  },
  {
    id: "coach",
    route: ROUTES.coach,
    title: "AI Trainer",
    summary: "Chat mit KI in fünf Modi: Coach, Quiz, Flashcards, Plan und Erklären.",
    details: [
      "Der Coach kennt deine Klausuren, Themen und offenen Aufgaben als Kontext.",
      "Quiz und Flashcards werden als interaktive Karten im Chat angezeigt.",
      "GLM und DeepSeek laufen über Supabase – dein Account schaltet die KI frei.",
      "Wähle links den Modus und stelle Fragen zum aktuellen Lernstoff."
    ],
    icon: Bot
  },
  {
    id: "focus",
    route: ROUTES.focus,
    title: "Fokusmodus (Pomodoro)",
    summary: "25 Minuten konzentriert lernen, 5 Minuten Pause – XP für abgeschlossene Sessions.",
    details: [
      "Starte den Timer für eine Pomodoro-Einheit.",
      "Abgeschlossene Sessions erhöhen deine Fokuszeit und bringen XP.",
      "Ideal für freie Wiederholung, wenn heute keine Aufgaben im Plan stehen."
    ],
    icon: Clock3
  },
  {
    id: "analytics",
    route: ROUTES.analytics,
    title: "Analytics",
    summary: "Lernzeit, XP-Verlauf, schwächstes Fach und freigeschaltete Badges.",
    details: [
      "Sieh, wie viel Zeit du pro Fach investiert hast.",
      "Das schwächste Fach wird aus Themenfortschritt berechnet.",
      "XP-Verlauf und Badges motivieren dich langfristig dranzubleiben."
    ],
    icon: BarChart3
  },
  {
    id: "settings",
    route: ROUTES.settings,
    title: "Einstellungen",
    summary: "Theme, Erinnerungen, Standard-Lernzeit und optionaler Cloud Sync.",
    details: [
      "Wechsle zwischen Hell, Dunkel und System-Theme.",
      "Aktiviere Push-Benachrichtigungen für tägliche Lernreminder.",
      "Cloud Sync mit Google Login synchronisiert Daten zwischen Geräten.",
      "Die Einführung kannst du hier jederzeit erneut starten."
    ],
    icon: Settings2
  },
  {
    id: "gamification",
    route: ROUTES.dashboard,
    title: "XP, Level und Streak",
    summary: "Lernen wird belohnt – Aufgaben, Themen und Fokus-Sessions bringen XP.",
    details: [
      "XP-Badge oben rechts zeigt Level und gesammelte Erfahrungspunkte.",
      "Streak zählt aufeinanderfolgende Lerntage.",
      "Badges wie „Fokusstart“ oder „7er Streak“ schaltest du durch Nutzung frei.",
      "Toast-Benachrichtigungen erscheinen, wenn du XP erhältst."
    ],
    icon: Flame
  },
  {
    id: "finish",
    route: ROUTES.dashboard,
    title: "Bereit zum Lernen!",
    summary: "Du kennst jetzt alle Funktionen. Leg los – oder passe die Demo-Klausuren an.",
    details: [
      "Die App startet mit Beispiel-Klausuren (Mathe & Biologie) – bearbeite oder lösche sie.",
      "Erstelle deine erste eigene Klausur unter „Klausuren“.",
      "Viel Erfolg bei der nächsten Prüfung!"
    ],
    icon: Trophy
  }
];