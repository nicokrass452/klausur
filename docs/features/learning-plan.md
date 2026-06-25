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

## Lernmaterialien pro Klausur

- Notizen, Links, PDFs pro Klausur
- Upload in Supabase Storage mit offline Fallback (siehe [materials.md](materials.md))

## iCal/Google-Calendar Export

- ICS-Export für einzelne Klausuren und alle aktiven Klausuren in `Exams` und `ExamDetail` verfügbar.

## Offene Punkte

- TODO section (not implemented yet): Lernplan ist nicht adaptiv — keine echte Schwachstellenanalyse oder dynamische Priorisierung aus Nutzungsdaten.
- TODO section (not implemented yet): Lerngruppen — kein Teilen von Plänen, keine gemeinsamen Klausuren.
