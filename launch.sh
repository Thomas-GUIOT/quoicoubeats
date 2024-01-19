#!/bin/bash

# Vérifier si le chemin du fichier est fourni en argument
if [ $# -eq 0 ]; then
    echo "Usage: $0 /chemin/vers/le/fichier.html"
    exit 1
fi

# Extraire le chemin du fichier
fichier_path="$1"

node ./bin/cli.js generate "$fichier_path"

if [ -n "$2" ]; then
    music_name=$(echo "$1" | rev | cut -d'/' -f1 | rev | cut -d'.' -f1)
else
    music_name=$(echo "$1" | cut -d'/' -f2 | cut -d'.' -f1)
fi

html_path=$(realpath "generated/${music_name}-midi-vizualizer.html")


if [ "$(uname)" == "Darwin" ]; then
    open -na "Google Chrome" --args --user-data-dir=/tmp/temporary-chrome-profile-dir --disable-web-security --disable-site-isolation-trials "file://${html_path}"
elif [ "$(uname)" == "Linux" ]; then
    google-chrome --user-data-dir=/tmp/temporary-chrome-profile-dir --disable-web-security --disable-site-isolation-trials "file://${html_path}"
else
    chrome.exe --user-data-dir=%TMP%\temporary-chrome-profile-dir --disable-web-security --disable-site-isolation-trials "file://${html_path}"
fi
