@echo off
setlocal enabledelayedexpansion

REM Vérifier si le chemin du fichier est fourni en argument
if "%~1" == "" (
    echo Usage: %0 ^<chemin^/vers/le/fichier.html^>
    exit /b 1
)

REM Extraire le chemin du fichier
set "fichier_path=%1"

node ./bin/cli.js generate "%fichier_path%"


IF NOT "%~2"=="" (
    REM Get the filename from the first argument's path
    for %%I in ("%~1") do set "music_name=%%~nI"
) ELSE (
    REM Get the second part of the path from the first argument
    for /f "tokens=2 delims=/" %%I in ("%~1") do set "music_name=%%~nI"
)

set "html_path=generated\!music_name!-midi-vizualizer.html"
set "html_path=!cd!\!html_path!"

if "%OS%"=="Windows_NT" (
    start "" "chrome.exe" "--user-data-dir=%TMP%\temporary-chrome-profile-dir" "--disable-web-security" "--disable-site-isolation-trials" "file://!html_path!"
) else (
    start "" "google-chrome" "--user-data-dir=/tmp/temporary-chrome-profile-dir" "--disable-web-security" "--disable-site-isolation-trials" "file://!html_path!"
)
