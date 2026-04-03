@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "MANIFEST_NAME=ai-excel-assistant-manifest.xml"
set "MANIFEST_PATH=%SCRIPT_DIR%\%MANIFEST_NAME%"
set "SHARE_NAME=AIExcelAssistantManifest"
set "NETWORK_PATH=\\%COMPUTERNAME%\%SHARE_NAME%"
set "CATALOG_GUID={9F6B4D44-6D17-4A1F-9F71-02B53A17A001}"

echo ===================================================
echo   AI EXCEL ASSISTANT - OTOMATIK EKLENTI KURULUMU
echo ===================================================
echo.

if not exist "%MANIFEST_PATH%" (
    echo HATA: Manifest dosyasi bulunamadi.
    echo Beklenen konum:
    echo %MANIFEST_PATH%
    echo.
    echo Bu BAT dosyasini manifest dosyasi ile ayni klasore koyup tekrar calistir.
    pause
    exit /b 1
)

net session >nul 2>&1
if not "%errorlevel%"=="0" (
    echo Yonetici izni gerekiyor. UAC penceresi aciliyor...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo [1/6] Excel kapatiliyor...
taskkill /F /IM excel.exe >nul 2>&1

echo [2/6] Office onbellegi temizleniyor...
rmdir /s /q "%LOCALAPPDATA%\Microsoft\Office\16.0\Wef" >nul 2>&1
rmdir /s /q "%LOCALAPPDATA%\Microsoft\Office\15.0\Wef" >nul 2>&1

echo [3/6] Manifestin oldugu klasor paylasima aciliyor...
net share %SHARE_NAME% /delete >nul 2>&1
net share %SHARE_NAME%="%SCRIPT_DIR%" /grant:Everyone,READ >nul
if not "%errorlevel%"=="0" (
    echo HATA: Ag paylasimi olusturulamadi.
    pause
    exit /b 1
)

echo [4/6] Excel ortak katalog ayarlari yaziliyor...
reg delete "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\%SHARE_NAME%" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\%CATALOG_GUID%" /v "Id" /t REG_SZ /d "%CATALOG_GUID%" /f >nul
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\%CATALOG_GUID%" /v "Url" /t REG_SZ /d "%NETWORK_PATH%" /f >nul
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\%CATALOG_GUID%" /v "Flags" /t REG_DWORD /d 1 /f >nul

echo [5/6] Gelistirici ve web eklenti izinleri aciliyor...
reg add "HKCU\Software\Microsoft\Office\16.0\Excel\Security" /v "blockwebextensions" /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\Developer" /v "DeveloperMode" /t REG_DWORD /d 1 /f >nul
CheckNetIsolation LoopbackExempt -a -n="microsoft.win32webviewhost_cw5n1h2txyewy" >nul 2>&1

echo [6/6] Excel yeniden baslatiliyor...
start "" excel.exe

echo.
echo Kurulum tamamlandi.
echo Manifest klasoru Excel katalogu olarak eklendi:
echo %NETWORK_PATH%
echo Katalog anahtari:
echo %CATALOG_GUID%
echo.
echo Excel icinde su adimi kullan:
echo Ekle ^> Eklentilerim ^> Paylasilan Klasor
echo.
echo Manifest dosyasi:
echo %MANIFEST_PATH%
echo.
pause
