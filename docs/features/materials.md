# Datei-Upload & Lernmaterialien

## Übersicht

Lernmaterialien (PDFs, Notizen, Links) werden pro Klausur verwaltet. PDF-Upload erfolgt in einen privaten Supabase Storage Bucket.

## Supabase Storage

- PDFs werden in einen privaten `materials` Bucket hochgeladen.
- RLS erlaubt nur dem eigenen User Zugriff auf Dateien unter `<user_id>/<exam_id>/<material_id>/`.
- Maximale Dateigröße: 10 MB.

## Migration

```sql
-- supabase/migrations/20250101000004_materials_storage.sql
```

## Edge Function Secrets

```powershell
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

## Offline Fallback

- Bei Nichtverfügbarkeit von Supabase Storage wird auf IndexedDB als Fallback zurückgegriffen.
- Vorschau und Download-Link sind in `ExamDetail` verfügbar.
