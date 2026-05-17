@echo off
setlocal
set "NODE_PATH=%APPDATA%\npm"
set "PATH=%NODE_PATH%;C:\Program Files\nodejs;C:\Windows\System32;C:\Windows;%PATH%"
cd /d "%~dp0.."
node node_modules\@react-native-community\cli\build\bin.js config
endlocal