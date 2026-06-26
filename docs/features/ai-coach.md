# KI-Coach (GLM + DeepSeek)

## Modi

- **Coach**: Persönlicher Lernberater
- **Quiz**: Interaktives Quiz zu Lernthemen
- **Karteikarten**: Automatisch generierte Karteikarten
- **Plan**: Lernplan-Vorschläge
- **Erklären**: Konzepte einfach erklärt

## Architektur

Die GLM- und DeepSeek-APIs werden nicht direkt aus dem Browser aufgerufen. Das Frontend ruft `supabase.functions.invoke("ai-coach")` auf; die Edge Function prüft das Supabase-Auth-JWT, validiert Eingaben und ruft erst GLM, dann DeepSeek auf. Erst wenn beide Provider fehlschlagen, nutzt das Frontend den lokalen Mock-Fallback.

```text
Frontend → Supabase Edge Function "ai-coach" → GLM API
                                      ↓
                              DeepSeek API (Fallback)
                                      ↓
                              Lokaler Mock-Fallback (Frontend)
```

## Proaktiver KI-Provider-Hinweis

- In Coach, ExamDetail und StudyPlan wird proaktiv angezeigt, ob der echte KI-Modus (Edge Function) aktiv ist oder der Mock-Fallback verwendet wird.

## Rate-Limit-Feedback

- HTTP-429 wird in `aiService` erkannt und als prominentes Rate-Limit-Feedback in Coach, ExamDetail und StudyPlan angezeigt.

## KI-Kontext aus Materialien

- Der Coach-Chat (`coachChat`-Aktion) erhält die hochgeladenen Lernmaterialien als Kontext:
  - **Notizen**: Titel und Inhalt (auf 800 Zeichen gekürzt) werden vollständig übergeben.
  - **PDFs**: Titel und Dateiname werden als Referenz übergeben (keine Textextraktion).
  - **Videos**: Titel und URL werden als Referenz übergeben.
- Die Materialien sind Teil des generischen `context`-Objekts, das in der Edge Function in den Prompt eingebettet wird (gesliced auf 6000 Zeichen).
- Die Kontext-Sidebar im Coach zeigt die Anzahl der erkannten Materialien an.
- Echte PDF-Textextraktion bleibt zurückgestellt; die aktuelle Umsetzung reicht aus, damit der Coach Notizen einbeziehen und auf PDFs/Videos verweisen kann.

## Edge Function deployen

```powershell
supabase login
supabase link --project-ref <dein-project-ref>
supabase secrets set GLM_API_KEY="<dein-zhipu-api-key>"
supabase secrets set GLM_MODEL="glm-4.7-flash"
supabase secrets set DEEPSEEK_API_KEY="<dein-deepseek-api-key>"
supabase secrets set DEEPSEEK_MODEL="deepseek-v4-flash"
supabase functions deploy ai-coach
```

Lokal testen:

```powershell
supabase functions serve ai-coach --env-file ./supabase/.env.local
```

`supabase/.env.local` nur lokal verwenden — nicht ins Frontend oder Git:

```text
GLM_API_KEY=...
GLM_MODEL=glm-4.7-flash
DEEPSEEK_API_KEY=...
DEEPSEEK_MODEL=deepseek-v4-flash
```

**Wichtig:** `GLM_API_KEY` und `DEEPSEEK_API_KEY` nie in `.env`, `.env.example` oder als `VITE_*` eintragen.
