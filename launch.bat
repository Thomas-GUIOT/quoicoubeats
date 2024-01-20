@echo off
setlocal enabledelayedexpansion

REM Vérifier si le chemin du fichier et le navigateur sont fournis en argument
if "%~1" == "" (
    echo Usage: %0 ^<chemin^/vers/le/fichier.html^> ^<chrome^|firefox^>
    exit /b 1
)

REM Extraire le chemin du fichier et le navigateur
set "fichier_path=%1"
set "browser=%2"

node ./bin/cli.js generate "%fichier_path%"

IF NOT "%~4"=="" (
    REM Get the filename from the first argument's path
    for %%I in ("%~1") do set "music_name=%%~nI"
) ELSE (
    REM Get the second part of the path from the first argument
    for /f "tokens=2 delims=/" %%I in ("%~1") do set "music_name=%%~nI"
)

if "%~3"=="keyboard" (
    set "html_path=generated\!music_name!-wk.html"
) ELSE (
    set "html_path=generated\!music_name!-midi-vizualizer.html"
)

set "html_path=!cd!\!html_path!"

if "%browser%"=="chrome" (
    start "" "chrome.exe" "--user-data-dir=%TMP%\temporary-chrome-profile-dir" "--disable-web-security" "--disable-site-isolation-trials" "file://!html_path!"
) ELSE if "%browser%"=="firefox" (
    start "" "firefox.exe" "file://!html_path!"
) ELSE (
    echo Invalid browser choice. Supported choices: chrome, firefox
    exit /b 1
)
