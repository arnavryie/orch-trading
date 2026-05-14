@echo off
echo Starting orch-trading...

start cmd /k "cd /d %~dp0 && .venv\Scripts\activate && uvicorn web.api:app --host 127.0.0.1 --port 8765 --reload"

timeout /t 3

start cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo Orch-trading is starting...
echo Backend: http://localhost:8765
echo Frontend: http://localhost:3000
pause
