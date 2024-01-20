#!/bin/bash

# Vérifier si le chemin du fichier est fourni en argument
if [ $# -lt 2 ]; then
    echo "Usage: $0 /chemin/vers/le/fichier.html chrome|firefox"
    exit 1
fi

# Extraire le chemin du fichier
fichier_path="$1"
browser="$2"

node ./bin/cli.js generate "$fichier_path"

if [ -n "$4" ]; then
    music_name=$(echo "$1" | rev | cut -d'/' -f1 | rev | cut -d'.' -f1 | tr -d '-')
else
    music_name=$(echo "$1" | cut -d'/' -f2 | cut -d'.' -f1 | tr -d '-')
fi

if [ "$3" == "keyboard" ]; then
    html_path=$(realpath "generated/${music_name}-wk.html")
else 
    html_path=$(realpath "generated/${music_name}-midi-vizualizer.html")
fi


if [ "$browser" == "chrome" ]; then
    if [ "$(uname)" == "Darwin" ]; then
        open -na "Google Chrome" --args --user-data-dir=/tmp/temporary-chrome-profile-dir --disable-web-security --disable-site-isolation-trials "file://${html_path}"
    elif [ "$(uname)" == "Linux" ]; then
        google-chrome --user-data-dir=/tmp/temporary-chrome-profile-dir --disable-web-security --disable-site-isolation-trials "file://${html_path}"
    else
        echo "Unsupported OS for Chrome"
        exit 1
    fi
elif [ "$browser" == "firefox" ]; then
    if [ "$(uname)" == "Darwin" ]; then
        open -na "Firefox" "file://${html_path}"
    elif [ "$(uname)" == "Linux" ]; then
        firefox "file://${html_path}"
    else
        echo "Unsupported OS for Firefox"
        exit 1
    fi
else
    echo "Invalid browser choice. Supported choices: chrome, firefox"
    exit 1
fi
