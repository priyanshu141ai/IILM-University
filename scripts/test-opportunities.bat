@echo off
REM Simple test script using curl (Windows)
SETLOCAL ENABLEDELAYEDEXPANSION
SET BASE=http://localhost:5000

echo === Login as admin ===
curl -s -X POST %BASE%/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@college.edu\",\"password\":\"admin123\"}"
echo.
echo If the login above returned a JSON with a token, copy the token value (without quotes).
set /p TOKEN=Enter token: 
echo.
echo === List opportunities (admin) ===
curl -s -H "Authorization: Bearer %TOKEN%" %BASE%/api/opportunities
echo.
echo === Create a draft opportunity (admin) ===
curl -s -X POST %BASE%/api/opportunities -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"title\":\"Test Opp From Script\",\"opportunityType\":\"International Internship\",\"status\":\"Draft\"}"
echo.
echo === Finished ===
ENDLOCAL
