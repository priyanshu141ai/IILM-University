@echo off
REM Removes any line starting with TOKEN from .env (makes a backup .env.bak)
if not exist .env (
  echo .env not found
  exit /b 1
)
copy .env .env.bak >nul
powershell -Command "Get-Content .env | Where-Object {$_ -notmatch '^\s*TOKEN\s*=\s*'} | Set-Content .env"
echo TOKEN lines removed from .env (backup saved as .env.bak)
