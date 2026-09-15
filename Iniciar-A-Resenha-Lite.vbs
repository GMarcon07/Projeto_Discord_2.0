' ========================================================
' A resenha - Versao Lite (Cliente Nuvem Render.com)
' Modo 100% silencioso: NAO abre qualquer janela preta de CMD!
' ========================================================
Set WshShell = CreateObject(WScript.Shell)
Set fso = CreateObject(Scripting.FileSystemObject)
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = currentDir

' Verificar se existe o executavel compilado da app
exePath = currentDir & \electron-app\dist-release\win-unpacked\A resenha.exe
If fso.FileExists(exePath) Then
    WshShell.Run " & exePath & ", 1, False
Else
    ' Libertar porta 5173 do Vite se estiver ocupada
    WshShell.Run cmd /c for /f tokens=5 %a in ('netstat -aon ^| findstr :5173 ') do taskkill /F /PID %a >nul 2>&1, 0, True
    ' Iniciar em modo dev silenciosamente (0 = janela oculta)
    WshShell.Run cmd /c npm run dev:electron --workspace=electron-app, 0, False
End If
