$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Join-Path $PSScriptRoot "..")
docker compose up --build -d
Write-Host "Project Management is running at http://localhost:8000"
