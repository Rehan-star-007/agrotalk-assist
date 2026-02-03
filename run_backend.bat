@echo off
TITLE AgroVoice Backend
echo ===================================================
echo   Starting AgroVoice Python Backend (YOLOv8)
echo ===================================================

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
    echo [ERROR] Server failed to start.
    pause
)
