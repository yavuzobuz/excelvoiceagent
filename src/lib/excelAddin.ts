/**
 * Excel Add-in Manifest and Installer Generator
 */

export const generateManifest = (baseUrl: string) => {
  const id = "a8b8c8d8-e8f8-4a8b-8c8d-8e8f8a8b8c8d";
  const version = "1.0.0.0";
  const providerName = "AI Excel Assistant";
  const displayName = "AI Excel Assistant";
  const description = "Yapay Zeka Destekli Excel Asistani";
  const buttonLabel = "AI Asistani Ac";
  const buttonTip = "Yapay zeka ile Excel verilerinizi yonetin.";
  const icon16 = "https://www.gstatic.com/images/icons/material/system/1x/auto_awesome_black_24dp.png";
  const icon80 = "https://www.gstatic.com/images/icons/material/system/2x/auto_awesome_black_24dp.png";

  const url = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const domain = url.replace(/\/$/, "");
  const addinUrl = `${url}app?addin=true`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp
  xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0"
  xmlns:ov="http://schemas.microsoft.com/office/taskpaneappversionoverrides"
  xsi:type="TaskPaneApp">
  <Id>${id}</Id>
  <Version>${version}</Version>
  <ProviderName>${providerName}</ProviderName>
  <DefaultLocale>tr-TR</DefaultLocale>
  <DisplayName DefaultValue="${displayName}" />
  <Description DefaultValue="${description}" />
  <IconUrl DefaultValue="${icon16}" />
  <HighResolutionIconUrl DefaultValue="${icon80}" />
  <SupportUrl DefaultValue="${url}" />
  <AppDomains>
    <AppDomain>${domain}</AppDomain>
  </AppDomains>
  <Hosts>
    <Host Name="Workbook" />
  </Hosts>
  <DefaultSettings>
    <SourceLocation DefaultValue="${addinUrl}" />
  </DefaultSettings>
  <Permissions>ReadWriteDocument</Permissions>
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
      <Host xsi:type="Workbook">
        <DesktopFormFactor>
          <GetStarted>
            <Title resid="GetStarted.Title" />
            <Description resid="GetStarted.Description" />
            <LearnMoreUrl resid="GetStarted.LearnMoreUrl" />
          </GetStarted>
          <FunctionFile resid="Commands.Url" />
          <ExtensionPoint xsi:type="PrimaryCommandSurface">
            <OfficeTab id="TabHome">
              <Group id="AIAsistanGroup">
                <Label resid="GroupLabel" />
                <Icon>
                  <bt:Image size="16" resid="Icon.16x16" />
                  <bt:Image size="32" resid="Icon.32x32" />
                  <bt:Image size="80" resid="Icon.80x80" />
                </Icon>
                <Control xsi:type="Button" id="TaskpaneButton">
                  <Label resid="ButtonLabel" />
                  <Supertip>
                    <Title resid="ButtonTitle" />
                    <Description resid="ButtonTip" />
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.16x16" />
                    <bt:Image size="32" resid="Icon.32x32" />
                    <bt:Image size="80" resid="Icon.80x80" />
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <TaskpaneId>ButtonId1</TaskpaneId>
                    <SourceLocation resid="Taskpane.Url" />
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
    </Hosts>
    <Resources>
      <bt:Images>
        <bt:Image id="Icon.16x16" DefaultValue="${icon16}" />
        <bt:Image id="Icon.32x32" DefaultValue="${icon16}" />
        <bt:Image id="Icon.80x80" DefaultValue="${icon80}" />
      </bt:Images>
      <bt:Urls>
        <bt:Url id="Commands.Url" DefaultValue="${addinUrl}" />
        <bt:Url id="GetStarted.LearnMoreUrl" DefaultValue="${url}" />
        <bt:Url id="Taskpane.Url" DefaultValue="${addinUrl}" />
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="GetStarted.Title" DefaultValue="${displayName}" />
        <bt:String id="GetStarted.Description" DefaultValue="${displayName} hazir." />
        <bt:String id="GroupLabel" DefaultValue="AI Asistan" />
        <bt:String id="ButtonLabel" DefaultValue="${buttonLabel}" />
        <bt:String id="ButtonTitle" DefaultValue="${buttonLabel}" />
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="ButtonTip" DefaultValue="${buttonTip}" />
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>`;
};

export const generateInstallerBat = (manifestFileName: string) => {
  return `@echo off
:: Yonetici izinleri kontrolu
>nul 2>&1 "%SYSTEMROOT%\\system32\\cacls.exe" "%SYSTEMROOT%\\system32\\config\\system"
if '%errorlevel%' NEQ '0' (
    echo Yonetici izinleri aliniyor...
    goto UACPrompt
) else ( goto gotAdmin )
:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\\getadmin.vbs"
    "%temp%\\getadmin.vbs"
    exit /B
:gotAdmin
    if exist "%temp%\\getadmin.vbs" ( del "%temp%\\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"

setlocal
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

set "SHARE_NAME=AIAsistanManifest"
set "NETWORK_PATH=\\%COMPUTERNAME%\\%SHARE_NAME%"

echo ===================================================
echo    AI EXCEL ASSISTANT - KESIN COZUM YUKLEYICI
echo ===================================================
echo.

echo [1/5] Excel arka planda aciksa zorla kapatiliyor...
taskkill /F /IM excel.exe >nul 2>&1

echo [2/5] Excel eklenti onbellegi (Cache) temizleniyor...
rmdir /s /q "%LOCALAPPDATA%\\Microsoft\\Office\\16.0\\Wef" >nul 2>&1

echo [3/5] Klasor ag paylasimina aciliyor (%NETWORK_PATH%)...
net share %SHARE_NAME% /delete >nul 2>&1
net share %SHARE_NAME%="%SCRIPT_DIR%" /grant:everyone,READ >nul 2>&1

echo [4/5] Guven Merkezi ayarlari (Kayit Defteri) zorla yaziliyor...
reg add "HKCU\\Software\\Microsoft\\Office\\16.0\\Excel\\Options\\WebExtensionCatalogs\\%SHARE_NAME%" /v "Url" /t REG_SZ /d "%NETWORK_PATH%" /f >nul
reg add "HKCU\\Software\\Microsoft\\Office\\16.0\\Excel\\Options\\WebExtensionCatalogs\\%SHARE_NAME%" /v "Flags" /t REG_DWORD /d 1 /f >nul
reg add "HKCU\\Software\\Microsoft\\Office\\16.0\\WEF\\TrustedCatalogs\\%SHARE_NAME%" /v "Id" /t REG_SZ /d "%NETWORK_PATH%" /f >nul
reg add "HKCU\\Software\\Microsoft\\Office\\16.0\\WEF\\TrustedCatalogs\\%SHARE_NAME%" /v "Flags" /t REG_DWORD /d 1 /f >nul

echo [5/5] Guvenlik ve Gelistirici ayarlari yapiliyor...
reg add "HKCU\\Software\\Microsoft\\Office\\16.0\\Excel\\Security" /v "blockwebextensions" /t REG_DWORD /d 0 /f >nul
reg add "HKCU\\Software\\Microsoft\\Office\\16.0\\WEF\\Developer" /v "DeveloperMode" /t REG_DWORD /d 1 /f >nul

echo.
echo [BASARILI] Islem Tamamlandi!
echo Eklenti %NETWORK_PATH% uzerinden Excel'e tanitildi.
echo.
echo Lutfen Excel'i acin -^> Ekle -^> Eklentilerim -^> Paylasilan Klasor adimini izleyin.
echo.
pause
`;
};

export const downloadAddinFiles = () => {
  const baseUrl = window.location.origin;
  const manifestContent = generateManifest(baseUrl);
  const manifestFileName = "ai-excel-assistant-manifest.xml";

  const batContent = generateInstallerBat(manifestFileName);
  const batFileName = "install-addin.bat";

  const manifestBlob = new Blob([manifestContent], { type: "text/xml" });
  const manifestUrl = URL.createObjectURL(manifestBlob);
  const manifestLink = document.createElement("a");
  manifestLink.href = manifestUrl;
  manifestLink.download = manifestFileName;
  document.body.appendChild(manifestLink);
  manifestLink.click();
  document.body.removeChild(manifestLink);

  const batBlob = new Blob([batContent], { type: "text/plain" });
  const batUrl = URL.createObjectURL(batBlob);
  const batLink = document.createElement("a");
  batLink.href = batUrl;
  batLink.download = batFileName;
  document.body.appendChild(batLink);
  batLink.click();
  document.body.removeChild(batLink);
};

export const isRunningInExcel = () => {
  return typeof Office !== "undefined" && Office.context && Office.context.host === Office.HostType.Excel;
};
