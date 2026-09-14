@echo off
TITLE Smart Retail Operations Suite - Master Launcher
COLOR 0B

echo =======================================================
echo   Smart Retail & Inventory Management System
echo   Launching Full-Stack Production Environment...
echo =======================================================
echo.

:: 1. Start FastAPI Backend (Port 8000)
echo [*] Starting FastAPI Backend on http://127.0.0.1:8000...
start "Smart Retail - FastAPI Backend" cmd /k "cd /d %~dp0backend && .\venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --port 8000"

:: 2. Start Vite Frontend (Port 5173)
echo [*] Starting React Frontend on http://localhost:5173...
start "Smart Retail - React Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =======================================================
echo   Both services initialized!
echo   - Backend API Docs: http://127.0.0.1:8000/docs
echo   - Web Application:  http://localhost:5173
echo =======================================================
timeout /t 3 >nul