$sql =
  (Get-Content -Raw ".\supabase\migrations\20240101000000_init.sql") +
  "`r`n`r`n" +
  (Get-Content -Raw ".\supabase\migrations\20250101000007_learning_groups.sql") +
  "`r`n`r`n" +
  (Get-Content -Raw ".\supabase\migrations\20260718000001_add_study_filesystem.sql")

Set-Clipboard -Value $sql