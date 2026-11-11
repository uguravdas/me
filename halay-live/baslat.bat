@echo off
cd /d %~dp0
if not exist node_modules call npm install
set /p U=TikTok kullanici adi (bos birakirsan sadece simulator): 
node server.js %U%
pause
