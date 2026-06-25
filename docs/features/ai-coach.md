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

## Offene Punkte

- TODO section (not implemented yet): **KI-Kontext aus Materialien** — Coach kennt hochgeladene PDFs/Notizen noch nicht. Das ist eine der nächsten Prioritäten.

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
