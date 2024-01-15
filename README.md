# Quoicoubeats

## Disable CORS Policy on Chrome

### MacOS (in Terminal)

open -na Google\ Chrome --args --user-data-dir=/tmp/temporary-chrome-profile-dir --disable-web-security --disable-site-isolation-trials

### Windows (from "Run" dialog [Windows+R] or start menu in Windows 8+)

chrome.exe --user-data-dir=%TMP%\temporary-chrome-profile-dir --disable-web-security --disable-site-isolation-trials

### Linux
TODO