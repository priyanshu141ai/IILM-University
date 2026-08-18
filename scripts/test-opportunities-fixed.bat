@echo off
REM Fixed auto test script: reads TOKEN from .env if present, else prompts.
SETLOCAL ENABLEDELAYEDEXPANSION
SET BASE=http://localhost:5000

REM Read TOKEN from .env (supports TOKEN= or TOKEN =)
set "TOKEN="
for /f "usebackq tokens=1* delims==" %%A in (`findstr /R /C:"^ *TOKEN *=" ".env" 2^>nul`) do (
  set "TOKEN_RAW=%%B"
)
if defined TOKEN_RAW (
  setlocal ENABLEDELAYEDEXPANSION
  set "T=!TOKEN_RAW!"
  :_trimstart
  if "!T:~0,1!"==" " (
    set "T=!T:~1!" & goto :_trimstart
  )
  :_trimend
  if "!T:~-1!"==" " (
    set "T=!T:~0,-1!" & goto :_trimend
  )
  endlocal & set "TOKEN=%T%"
)
if not defined TOKEN (
  echo No TOKEN found in .env. Please paste token (will not be displayed):
  set /p TOKEN=Enter token: 
)
echo.
echo === List opportunities (admin) ===
curl -s -H "Authorization: Bearer %TOKEN%" %BASE%/api/opportunities
echo.
echo === Create a draft opportunity (admin) ===
curl -s -X POST %BASE%/api/opportunities -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"title\":\"Test Opp From Fixed Script\",\"opportunityType\":\"International Internship\",\"status\":\"Draft\"}"
echo.
echo Done.
ENDLOCAL
