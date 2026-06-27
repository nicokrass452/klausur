# Lernplan & Klausurverwaltung

## Klausuren

- Klausuren mit Fach, Datum, Uhrzeit, Raum, Notizen, Schwierigkeit, Wissensstand, Tagesminuten
- Themen mit Fortschritt in Prozent
- Automatische Neuverteilung verpasster Aufgaben beim App-Start (sofern online und nicht im Offline-Lesemodus)

## Lernplan-Algorithmus

### Prioritätsformel

```text
priorität = (schwierigkeit × 2) + (6 − wissensstand)
```

### Verteilung

- 70 % neue Inhalte
- 20 % Wiederholung
- 10 % Puffer

### Spaced Repetition

Wiederholungsintervalle: Tag 1, 2, 5, 10, 18

### Automatische + manuelle Neuverteilung

- Verpasste Aufgaben werden beim App-Start automatisch neu verteilt, sofern online und nicht im Offline-Lesemodus.
- Manuelle Neuverteilung ist ebenfalls möglich.

### Adaptive Lernplanung

- Der adaptive Generator bewertet Themen nach Schwierigkeit, Wissensstand, Abschlussstatus, verpassten Aufgaben, ueberfaelligen offenen Aufgaben und Naehe zum Klausurtermin.
- `StudyPlan` zeigt die staerksten Schwachstellen als Score-Karten an.
- "Adaptiv neu planen" ersetzt offene/nicht erledigte Aufgaben einer Klausur durch einen neuen Plan und erhaelt bereits abgeschlossene Aufgaben als Lernhistorie.

## Lernmaterialien pro Klausur

- Notizen, Links, PDFs pro Klausur
- Upload in Supabase Storage mit offline Fallback (siehe [materials.md](materials.md))

## iCal/Google-Calendar Export

- ICS-Export für einzelne Klausuren und alle aktiven Klausuren in `Exams` und `ExamDetail` verfügbar.

## Lerngruppen / geteilte Plaene

- Nutzer koennen lokale Lerngruppen mit Name, Einladungscode und Mitgliedern anlegen.
- Klausuren lassen sich pro Gruppe ein- und aushaengen.
- Die Gruppenkarte kann eine Plan-Zusammenfassung mit Code, Mitgliedern und Aufgabenstatus in die Zwischenablage kopieren.
- Lerngruppen sind Teil des lokalen Snapshots und werden ueber `learning_groups` mit Supabase synchronisiert.

## Offene Punkte

- Realtime-/Mehrbenutzerbeitritt fuer Lerngruppen bleibt ein spaeterer Ausbau.
