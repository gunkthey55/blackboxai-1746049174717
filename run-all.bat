@echo off
echo Starting Backend and Frontend servers...

:: Start the backend server in a new window
start cmd /k "node server/index.js"

:: Start the frontend server in a new window
start cmd /k "node server/static.js"

echo Servers started!
echo Frontend: http://localhost:8000
echo Backend: http://localhost:3001
echo.
echo You can now open http://localhost:8000 in your browser.
