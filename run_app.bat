@echo off
TITLE AgroVoice Full Stack Application
echo ===================================================
echo   Starting AgroVoice Application (Frontend + Backend)
echo ===================================================

echo [INFO] Starting Frontend (Vite)...
start cmd /k "npm run dev"

echo [INFO] Starting Node.js Backend...
start cmd /k "npm run dev:backend"

echo [INFO] Starting Backend (FastAPI)...
cd backend_py

:: Check if venv exists
if not exist "venv" (
    echo [INFO] Virtual environment not found. Creating one...
    python -m venv venv
    
    echo [INFO] Activating virtual environment...
    call venv\Scripts\activate
    
    echo [INFO] Installing dependencies...
    pip install -r requirements.txt
) else (
    echo [INFO] Activating virtual environment...
    call venv\Scripts\activate
)

echo.
echo [INFO] Launching FastAPI Server...
echo [LINK] http://localhost:8000
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

if errorlevel 1 (
    echo.
    echo [ERROR] Backend server failed to start.
    pause
)
