@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."

IF NOT EXIST "%PROJECT_ROOT%\.env" (
    echo.
    echo [ERROR] The .env file was not found in the project root.
    echo Please ensure .env exists at the root of your project.
    echo.
    exit /b 1
)

echo Tearing down the existing development environment (including volumes)...
docker-compose -f "%PROJECT_ROOT%\deploy\docker-compose.dev.yml" --env-file "%PROJECT_ROOT%\.env" down -v

echo.
echo Starting a fresh development environment...
docker-compose -f "%PROJECT_ROOT%\deploy\docker-compose.dev.yml" --env-file "%PROJECT_ROOT%\.env" up --build -d

echo.
echo --- Setup complete. Application is running. ---

echo --- http://localhost:5000/ ---
endlocal