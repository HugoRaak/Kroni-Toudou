$sourceDir = "hooks"
$targetDir = ".git/hooks"

if (-not (Test-Path $sourceDir)) {
    Write-Host "❌ Le dossier '$sourceDir' n'existe pas." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $targetDir)) {
    Write-Host "❌ Le dossier '$targetDir' n'existe pas. Assurez-vous d'être dans un dépôt Git." -ForegroundColor Red
    exit 1
}

# Copier tous les hooks du dossier versionné
$hooks = Get-ChildItem -Path $sourceDir -File

if ($hooks.Count -eq 0) {
    Write-Host "⚠️  Aucun hook trouvé dans '$sourceDir'." -ForegroundColor Yellow
    exit 0
}

foreach ($hook in $hooks) {
    $targetPath = Join-Path $targetDir $hook.Name
    Copy-Item -Path $hook.FullName -Destination $targetPath -Force
    
    Write-Host "✅ Hook '$($hook.Name)' installé" -ForegroundColor Green
}

Write-Host "`n✅ Tous les hooks ont été installés avec succès!" -ForegroundColor Green
Write-Host "   Les hooks seront exécutés automatiquement lors des opérations Git." -ForegroundColor Cyan

