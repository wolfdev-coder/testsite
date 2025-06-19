@echo off
ECHO Starting Node.js server...

:: Проверка, установлен ли nodemon
where nodemon >nul 2>nul
IF %ERRORLEVEL% EQU 0 (
    :: Запуск в режиме разработки с nodemon, если он установлен
    ECHO Starting server in development mode with nodemon...
    nodemon server.js
) ELSE (
    :: Запуск в production-режиме с node
    ECHO Starting server in production mode...
    node server.js
)

:: Пауза для отображения ошибок, если они возникнут
IF %ERRORLEVEL% NEQ 0 (
    ECHO An error occurred. Press any key to exit.
    pause
)