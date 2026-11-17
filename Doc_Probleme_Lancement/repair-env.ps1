<#
 repair-env.ps1 - Repare l'environnement Node/npm du projet Electron (E-audit / AionUi) sous Windows.

 A LANCER dans un vrai terminal Windows (Windows Terminal ou PowerShell), PAS dans le terminal
 integre d'un agent/IDE. Idealement en ADMIN (pour l'exclusion Defender, facultatif).

   powershell -NoProfile -ExecutionPolicy Bypass -File .\repair-env.ps1

 Options :
   -ProjectDir  <chemin>   dossier du projet (defaut : dossier du script, sinon G:\Aionui_client)
   -NodeVersion 22.22.0    version Node deja installee par nvm4w (utilisee SANS "nvm use")
   -DiagOnly               diagnostic seulement, ne modifie rien
   -NoLaunch               ne lance pas "npm run dev" a la fin
#>
[CmdletBinding()]
param(
  [string]$ProjectDir,
  [string]$NodeVersion = "22.22.0",
  [switch]$DiagOnly,
  [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

function Step($m) { Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "[OK] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[!!] $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "[KO] $m" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- 0. Projet
if (-not $ProjectDir) {
  if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "package.json"))) { $ProjectDir = $PSScriptRoot }
  else { $ProjectDir = "G:\Aionui_client" }
}
if (-not (Test-Path (Join-Path $ProjectDir "package.json"))) { Fail "package.json introuvable dans $ProjectDir (utilisez -ProjectDir)" }
Set-Location $ProjectDir
Ok "Projet : $ProjectDir"

# ---------------------------------------------------------------- 1. Node sans "nvm use"
Step "1/7  Node $NodeVersion via PATH de session (aucun symlink, aucun droit admin)"
$nodeDir = Join-Path $env:LOCALAPPDATA "nvm\v$NodeVersion"
$nodeExe = Join-Path $nodeDir "node.exe"
$npmCmd  = Join-Path $nodeDir "npm.cmd"
if (-not (Test-Path $nodeExe)) {
  $dispo = (Get-ChildItem (Join-Path $env:LOCALAPPDATA "nvm") -Directory -Filter "v*" -ErrorAction SilentlyContinue | ForEach-Object { $_.Name }) -join ", "
  Fail "Node $NodeVersion introuvable dans $nodeDir. Versions presentes : $dispo"
}
# retire les autres Node du PATH de cette session, puis met celui-ci en premier
$clean = $env:Path -split ';' | Where-Object { $_ -and ($_ -notmatch '\\nodejs\\?$') -and ($_ -notmatch '\\nvm\\v\d') }
$env:Path = (@($nodeDir) + $clean) -join ';'
$v = (& $nodeExe -v).Trim()
if ($v -ne "v$NodeVersion") { Fail "Version Node inattendue : $v" }
Ok "node $v / npm $((& $npmCmd -v).Trim())"

# ---------------------------------------------------------------- 2. Diagnostic reseau
Step "2/7  Diagnostic reseau (registry npm, GitHub pour le binaire Electron)"
function Test-Url([string]$Url, [int]$TimeoutSec = 20) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  try {
    Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -MaximumRedirection 5 | Out-Null
    return [pscustomobject]@{ Ok = $true;  Ms = $sw.ElapsedMilliseconds; Err = "" }
  } catch {
    return [pscustomobject]@{ Ok = $false; Ms = $sw.ElapsedMilliseconds; Err = $_.Exception.Message }
  }
}
$registry = (& $npmCmd config get registry).Trim()
if (-not $registry.EndsWith("/")) { $registry += "/" }

$r1 = Test-Url "$($registry)-/ping"
if ($r1.Ok) { Ok "registry $registry : $($r1.Ms) ms" } else { Warn "registry $registry inaccessible ($($r1.Err))" }

$r2 = Test-Url "https://github.com/electron/electron/releases/download/v37.0.0/SHASUMS256.txt" 30
if ($r2.Ok) { Ok "GitHub releases : $($r2.Ms) ms" } else { Warn "GitHub releases inaccessible/lent ($($r2.Err))" }

if (-not $r1.Ok) {
  $m1 = Test-Url "https://registry.npmmirror.com/-/ping"
  if ($m1.Ok) { $env:npm_config_registry = "https://registry.npmmirror.com"; Ok "Bascule sur registry.npmmirror.com (session uniquement)" }
  else { Warn "Miroir npm inaccessible aussi : verifiez proxy/VPN/pare-feu" }
}
if (-not $r2.Ok -or $r2.Ms -gt 8000) {
  $env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
  Ok "Binaire Electron : miroir npmmirror (session uniquement)"
}
if ($DiagOnly) { Write-Host "`n-DiagOnly : arret ici."; exit 0 }

# ---------------------------------------------------------------- 3. Defender
Step "3/7  Exclusions Windows Defender (le scan temps reel ralentit npm x5-10)"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$npmCache = (& $npmCmd config get cache).Trim()
if ($isAdmin) {
  try { Add-MpPreference -ExclusionPath $ProjectDir, $npmCache; Ok "Exclusions ajoutees : $ProjectDir et $npmCache" }
  catch { Warn "Exclusion Defender impossible : $($_.Exception.Message)" }
} else {
  Warn "Terminal non-admin : exclusion Defender ignoree (gain de vitesse perdu, mais ca marche)"
}

# ---------------------------------------------------------------- 4. Nettoyage
Step "4/7  Nettoyage de node_modules et verification du cache npm"
$nm = Join-Path $ProjectDir "node_modules"
if (Test-Path $nm) {
  Write-Host "Suppression de node_modules (rd /s /q, beaucoup plus rapide que Remove-Item)..."
  cmd /c "rd /s /q `"$nm`"" | Out-Null
  if (Test-Path $nm) { Fail "node_modules n'a pas pu etre supprime (fichier verrouille ? fermez VS Code/Electron/antivirus)" }
}
Ok "node_modules supprime (package-lock.json CONSERVE volontairement)"
& $npmCmd cache verify
if ($LASTEXITCODE -ne 0) { Warn "cache verify a signale un probleme" }

# ---------------------------------------------------------------- 5. Installation surveillee
Step "5/7  Installation npm surveillee (sans scripts, detection de blocage)"
function Invoke-NpmWatched {
  param([string[]]$NpmArgs, [string]$Tag, [int]$StallMin = 5, [int]$MaxMin = 40)
  $outLog = Join-Path $ProjectDir "npm-$Tag.out.log"
  $errLog = Join-Path $ProjectDir "npm-$Tag.err.log"
  $p = Start-Process -FilePath $npmCmd -ArgumentList $NpmArgs -WorkingDirectory $ProjectDir -NoNewWindow -PassThru `
        -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $lastSize = -1L
  $lastChange = Get-Date
  while (-not $p.HasExited) {
    Start-Sleep -Seconds 10
    $size = 0L
    foreach ($f in @($outLog, $errLog)) { if (Test-Path $f) { $size += (Get-Item $f).Length } }
    if ($size -ne $lastSize) { $lastSize = $size; $lastChange = Get-Date }
    $tail = ""
    if (Test-Path $errLog) { $tail = [string](Get-Content $errLog -Tail 1 -ErrorAction SilentlyContinue) }
    if ($tail.Length -gt 110) { $tail = $tail.Substring(0, 110) }
    Write-Host ("  [{0:mm\:ss}] {1}" -f $sw.Elapsed, $tail)
    if (((Get-Date) - $lastChange).TotalMinutes -ge $StallMin) {
      & taskkill /PID $p.Id /T /F | Out-Null
      Warn "Aucune activite reseau/disque depuis $StallMin min : arret."
      return -999
    }
    if ($sw.Elapsed.TotalMinutes -ge $MaxMin) {
      & taskkill /PID $p.Id /T /F | Out-Null
      Warn "Duree maximale ($MaxMin min) depassee : arret."
      return -998
    }
  }
  $p.WaitForExit()
  if ($p.ExitCode -ne 0 -and (Test-Path $errLog)) {
    Write-Host "--- fin de $errLog ---" -ForegroundColor DarkGray
    Get-Content $errLog -Tail 15 | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
  }
  return $p.ExitCode
}

$useCi = Test-Path (Join-Path $ProjectDir "package-lock.json")
$common = @("--ignore-scripts", "--no-audit", "--no-fund", "--legacy-peer-deps", "--prefer-offline",
            "--fetch-timeout=120000", "--fetch-retries=4", "--loglevel=http")
$verb = "install"
if ($useCi) { $verb = "ci" }
$code = Invoke-NpmWatched -NpmArgs (@($verb) + $common) -Tag "install"

if ($code -gt 0 -and $useCi) {
  Warn "npm ci a echoue (lockfile desynchronise ?). Nouvelle tentative avec npm install."
  if (Test-Path $nm) { cmd /c "rd /s /q `"$nm`"" | Out-Null }
  $code = Invoke-NpmWatched -NpmArgs (@("install") + $common) -Tag "install2"
}
if ($code -ne 0) {
  Fail "Installation echouee (code $code). Relancez le script (il repart d'un etat propre) et envoyez-moi npm-install.err.log."
}
Ok "Arbre de dependances installe"

# ---------------------------------------------------------------- 6. Binaire Electron + postinstall
Step "6/7  Binaire Electron et scripts postinstall du projet"
& $nodeExe (Join-Path $nm "electron\install.js")
if ($LASTEXITCODE -ne 0) { Fail "Telechargement du binaire Electron echoue (reseau/GitHub). Relancez avec un VPN ou verifiez ELECTRON_MIRROR." }
if (-not (Test-Path (Join-Path $nm "electron\dist\electron.exe"))) { Fail "electron.exe absent apres install.js" }
Ok "Binaire Electron present"

$pkg = Get-Content (Join-Path $ProjectDir "package.json") -Raw | ConvertFrom-Json
if ($pkg.scripts -and ($pkg.scripts.PSObject.Properties.Name -contains "postinstall")) {
  Write-Host "Execution de 'npm run postinstall' (modules natifs ?)..."
  $code = Invoke-NpmWatched -NpmArgs @("run", "postinstall") -Tag "postinstall" -StallMin 8
  if ($code -ne 0) { Warn "postinstall en erreur (code $code) : voir npm-postinstall.err.log. Modules natifs a recompiler ? (Visual Studio Build Tools requis)" }
  else { Ok "postinstall termine" }
} else {
  Warn "Pas de script postinstall dans package.json (OK si aucun module natif)."
}

# ---------------------------------------------------------------- 7. Verification d'integrite
Step "7/7  Verification d'integrite de node_modules"
$must = @(
  "node_modules\@babel\core\package.json",
  "node_modules\@babel\parser\package.json",
  "node_modules\@babel\types\package.json",
  "node_modules\@babel\helpers\package.json",
  "node_modules\@babel\runtime\package.json",
  "node_modules\.bin\electron-vite.cmd",
  "node_modules\.bin\electron.cmd",
  "node_modules\electron-vite\bin\electron-vite.js"
)
$missing = $must | Where-Object { -not (Test-Path (Join-Path $ProjectDir $_)) }
if ($missing) { $missing | ForEach-Object { Write-Host "  manquant : $_" -ForegroundColor Red }; Fail "Fichiers critiques manquants" }
Ok "Fichiers critiques presents"

$bad = Get-ChildItem $nm -Directory -Force |
  Where-Object { $_.Name -notlike '.*' } |
  ForEach-Object { if ($_.Name -like '@*') { Get-ChildItem $_.FullName -Directory -Force } else { $_ } } |
  Where-Object { $_.Name -notlike '.*' -and -not (Test-Path (Join-Path $_.FullName "package.json")) }
if ($bad) { $bad | ForEach-Object { Write-Host "  sans package.json : $($_.FullName)" -ForegroundColor Red }; Fail "Packages corrompus detectes" }
$count = (Get-ChildItem $nm -Directory -Force | Where-Object { $_.Name -notlike '.*' }).Count
Ok "Aucun package corrompu ($count dossiers de premier niveau)"

Write-Host ""
Write-Host "Environnement repare." -ForegroundColor Green
if ($NoLaunch) { Write-Host "Lancez ensuite : npm run dev"; exit 0 }
Step "Lancement de l'application"
& $npmCmd run dev
