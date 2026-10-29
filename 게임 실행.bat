@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 이상의 LTS 버전을 https://nodejs.org 에서 설치해 주세요.
  echo 설치 후 이 파일을 다시 실행해 주세요.
  pause
  exit /b 1
)
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173/package.json -TimeoutSec 2; if ($r.Content -match 'little-hearth-bakery') { exit 0 } } catch {}; exit 1"
if not errorlevel 1 (
  start "" "http://127.0.0.1:5173"
  exit /b 0
)
start "" powershell -NoProfile -Command "for ($i=0; $i -lt 30; $i++) { try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173/package.json -TimeoutSec 1; if ($r.Content -match 'little-hearth-bakery') { Start-Process 'http://127.0.0.1:5173'; exit } } catch {}; Start-Sleep -Milliseconds 500 }; Write-Host '서버를 시작하지 못했습니다. 실행 창의 오류를 확인해 주세요.'; Read-Host"
node server.js
pause
