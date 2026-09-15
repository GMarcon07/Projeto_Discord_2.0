' ========================================================
' A resenha - Versao Normal (Servidor Host Local + Desktop)
' Modo 100% silencioso: O servidor corre em segundo plano
' SEM abrir qualquer janela preta do CMD!
' ========================================================
Set WshShell = CreateObject(WScript.Shell)
Set fso = CreateObject(Scripting.FileSystemObject)
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = currentDir

' 1. Libertar portas 3001 e 5173 caso estejam presas
WshShell.Run cmd /c for /f tokens=5 %a in ('netstat -aon ^| findstr :3001 ') do taskkill /F /PID %a >nul 2>&1, 0, True
WshShell.Run cmd /c for /f tokens=5 %a in ('netstat -aon ^| findstr :5173 ') do taskkill /F /PID %a >nul 2>&1, 0, True

' 2. Iniciar o Servidor Backend silenciosamente em segundo plano (0 = oculto)
WshShell.Run cmd /c node server/dist/index.js, 0, False

' Aguardar 1.5 segundos para o servidor inicializar
WScript.Sleep 1500

' 3. Iniciar a Aplicacao Desktop
exePath = currentDir & \electron-app\dist-release\win-unpacked\A resenha.exe
If fso.FileExists(exePath) Then
    WshShell.Run " & exePath & ", 1, False
Else
    WshShell.Run cmd /c npm run dev:electron --workspace=electron-app, 0, False
End If
