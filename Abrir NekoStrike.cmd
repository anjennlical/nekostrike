@echo off
setlocal
 title NekoStrike - mantenha esta janela aberta
cd /d "%~dp0"
where.exe node >nul 2>&1
if errorlevel 1 (
  echo Nao foi possivel encontrar o Node.js.
  echo Consulte as instrucoes de instalacao no README.md desta pasta.
  pause
  exit /b 1
)
echo.
echo Iniciando o NekoStrike...
echo Quando os servidores estiverem prontos, abra no navegador:
echo http://127.0.0.1:5173/#lab
echo.
echo Mantenha esta janela aberta enquanto usa o projeto.
echo Para encerrar, pressione Ctrl+C.
echo.
node "scripts\workspace.mjs" start
if errorlevel 1 (
  echo.
  echo O NekoStrike foi encerrado ou encontrou um erro.
  echo Se as portas estiverem ocupadas, confira a janela ja aberta do projeto.
  echo Copie a mensagem acima caso precise de ajuda.
  pause
)
endlocal
