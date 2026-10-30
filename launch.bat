@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 goto folder_error
if not exist "%~dp0server.js" goto missing_files
where node >nul 2>nul
if errorlevel 1 goto missing_node
powershell.exe -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5174/package.json -TimeoutSec 2; if ($r.Content -match 'little-hearth-bakery') { exit 0 } } catch {}; exit 1"
if not errorlevel 1 goto open_browser
start "Bakery browser" powershell.exe -NoProfile -Command "for ($i=0; $i -lt 30; $i++) { try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5174/package.json -TimeoutSec 1; if ($r.Content -match 'little-hearth-bakery') { Start-Process 'http://127.0.0.1:5174'; exit } } catch {}; Start-Sleep -Milliseconds 500 }; Write-Host 'Server did not start. Check the game server window.'; Read-Host"
echo Starting Bakery DEMO. Keep this window open while playing.
node "%~dp0server.js"
pause
popd
exit /b
:open_browser
start "" "http://127.0.0.1:5174"
popd
exit /b 0
:missing_node
echo Please install Node.js LTS from https://nodejs.org/ and try again.
pause
popd
exit /b 1
:missing_files
echo server.js was not found. Extract the entire ZIP before running this file.
pause
popd
exit /b 1
:folder_error
echo Cannot open the game folder. Extract the ZIP to a local folder first.
pause
exit /b 1
