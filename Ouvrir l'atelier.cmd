@echo off
title Atelier
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (py vf.py interface) else (python vf.py interface)
if errorlevel 1 pause
