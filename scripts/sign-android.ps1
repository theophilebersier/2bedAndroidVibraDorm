param(
    [Parameter(Mandatory=$true)][string]$KeyStore,
    [Parameter(Mandatory=$true)][string]$PasswordFile,
    [Parameter(Mandatory=$true)][string]$BuildToolsDirectory,
    [Parameter(Mandatory=$true)][string]$OutputApk
)
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$unsignedApk = Join-Path $projectDirectory 'android\app\build\outputs\apk\release\app-release-unsigned.apk'
$alignedApk = Join-Path $projectDirectory 'android\app\build\outputs\apk\release\app-release-aligned.apk'
& (Join-Path $BuildToolsDirectory 'zipalign.exe') -f -p 4 $unsignedApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw 'APK alignment failed.' }
& (Join-Path $BuildToolsDirectory 'apksigner.bat') sign --ks $KeyStore --ks-key-alias dual-bed-sync --ks-pass "file:$PasswordFile" --v4-signing-enabled false --out $OutputApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw 'APK signing failed.' }
& (Join-Path $BuildToolsDirectory 'apksigner.bat') verify --verbose --print-certs $OutputApk
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
$digest = (Get-FileHash -LiteralPath $OutputApk -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText("$OutputApk.sha256", "$digest  $([IO.Path]::GetFileName($OutputApk))`n")
