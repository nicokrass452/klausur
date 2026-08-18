# Copies the full migration chain to the clipboard for manual application via
# the Supabase SQL editor.
#
# Prefer `supabase db push`, which tracks which migrations were already applied.
# This script is a fallback for when the CLI is unavailable; it emits *every*
# migration in version order rather than a hand-picked subset, so the schema it
# produces matches what the CLI would produce.

$migrations = Get-ChildItem -Path ".\supabase\migrations\*.sql" | Sort-Object Name

if (-not $migrations) {
  Write-Error "No migrations found under .\supabase\migrations\"
  exit 1
}

$sql = ($migrations | ForEach-Object {
  "-- ==== $($_.Name) ====`r`n" + (Get-Content -Raw $_.FullName)
}) -join "`r`n`r`n"

Set-Clipboard -Value $sql
Write-Host "Copied $($migrations.Count) migration(s) to the clipboard:"
$migrations | ForEach-Object { Write-Host "  $($_.Name)" }
