@echo off
cd /d %~dp0
echo [🌀] Preparing upload to GitHub...

git add .
git commit -m "Initial upload"
git branch -M main
git remote add origin https://github.com/Daogao9713/lain-chat.git
git push -u origin main

echo [✅] Upload complete.
pause
