<#
    Tesla Carview - Setup-Assistent fuer Windows
    ============================================

    Gegenstueck zu deploy/setup.sh + deploy/setup-wizard.sh, die beide Bash,
    apt, systemd und certbot voraussetzen und deshalb unter Windows nicht
    laufen. Dieses Skript macht denselben Teil, der unter Windows ueberhaupt
    sinnvoll ist: Konfiguration erzeugen und den Container-Stack starten.

    Voraussetzung: Docker Desktop mit WSL2-Backend. Die App laeuft
    vollstaendig in Linux-Containern; Windows ist nur der Host.

    Aufruf (PowerShell im Repo-Verzeichnis):
        powershell -ExecutionPolicy Bypass -File .\deploy\setup-windows.ps1

    Was dieses Skript NICHT tut (bewusst):
      * Kein nginx, kein certbot, kein HTTPS. Fuer den Zugriff aus dem
        Internet - und damit fuer die Tesla-Anbindung - braucht es einen
        Reverse-Proxy mit gueltigem Zertifikat, siehe docs/14-network-access.md.
      * Kein tesla-http-proxy. Der braucht einen Linux-Bind-Mount und eine
        feste UID; unter Windows bleibt er aus. Folge: Fahrzeugbefehle
        (Signed Commands) funktionieren nicht, alles Lesende schon.
#>

[CmdletBinding()]
param(
    # Adresse, unter der die App spaeter erreichbar ist. Landet als
    # FRONTEND_URL in der .env und bestimmt die Tesla-Redirect-URI.
    [string] $AppUrl,
    # Ollama (lokaler KI-Chat) mitstarten. Braucht 4+ GB RAM.
    [switch] $WithOllama,
    # Vorhandene Konfiguration ueberschreiben statt abzubrechen.
    [switch] $Force
)

$ErrorActionPreference = 'Stop'

function Write-Step { param($Text) Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-Ok   { param($Text) Write-Host "    OK  $Text" -ForegroundColor Green }
function Write-Warn { param($Text) Write-Host "    !   $Text" -ForegroundColor Yellow }
function Fail       { param($Text) Write-Host "`nFEHLER: $Text" -ForegroundColor Red; exit 1 }

# Repo-Wurzel = Elternverzeichnis von deploy\
$RepoRoot = Split-Path -Parent $PSScriptRoot
$EnvFile      = Join-Path $RepoRoot 'backend\.env'
$ComposeFile  = Join-Path $RepoRoot 'docker-compose.prod.yml'
$OverrideFile = Join-Path $RepoRoot 'docker-compose.override.yml'

Write-Host "Tesla Carview - Setup fuer Windows" -ForegroundColor White
Write-Host "Repo: $RepoRoot"

# ---------------------------------------------------------------------------
# 1) Vorbedingungen
# ---------------------------------------------------------------------------
Write-Step 'Docker pruefen'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker wurde nicht gefunden. Docker Desktop installieren (WSL2-Backend) und neu starten:`n       https://docs.docker.com/desktop/install/windows-install/"
}

try { docker info 2>&1 | Out-Null } catch { }
if ($LASTEXITCODE -ne 0) {
    Fail 'Docker Desktop laeuft nicht. Starten und danach dieses Skript erneut ausfuehren.'
}
Write-Ok 'Docker Desktop erreichbar'

# `required: false` in depends_on braucht Compose >= 2.20.
$composeVersion = (docker compose version --short 2>$null)
if (-not $composeVersion) { Fail 'docker compose (v2) nicht verfuegbar. Docker Desktop aktualisieren.' }
$parsed = [version](($composeVersion -replace '^v','') -split '-')[0]
if ($parsed -lt [version]'2.20.0') {
    Fail "Docker Compose $composeVersion ist zu alt (mindestens 2.20 noetig). Docker Desktop aktualisieren."
}
Write-Ok "Docker Compose $composeVersion"

if (-not (Test-Path $ComposeFile)) {
    Fail "docker-compose.prod.yml nicht gefunden. Dieses Skript aus dem geklonten Repository heraus starten."
}

# ---------------------------------------------------------------------------
# 2) Konfiguration erfragen
# ---------------------------------------------------------------------------
Write-Step 'Konfiguration'

if (-not $AppUrl) {
    # NICHT $input nennen — das ist in PowerShell eine automatische Variable.
    $answer = Read-Host '    URL der Anwendung [http://localhost:8080]'
    $AppUrl = if ([string]::IsNullOrWhiteSpace($answer)) { 'http://localhost:8080' } else { $answer.Trim() }
}
$AppUrl = $AppUrl.TrimEnd('/')

if ($AppUrl -like 'http://*' -and $AppUrl -notlike 'http://localhost*' -and $AppUrl -notlike 'http://127.0.0.1*') {
    Write-Warn 'Ohne HTTPS lehnt Tesla die Anmeldung ab. Fuer die Fahrzeug-Anbindung einen Reverse-Proxy mit Zertifikat davorsetzen (docs/14-network-access.md).'
}

if (Test-Path $EnvFile) {
    if (-not $Force) {
        Fail "Es gibt bereits eine Konfiguration: $EnvFile`n       Mit -Force ueberschreiben (vorher sichern!)."
    }
    $backup = "$EnvFile.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $EnvFile $backup
    Write-Warn "Bestehende .env gesichert nach $backup"
}

# JWT-Secret: 64 Byte aus dem Krypto-RNG, hex-kodiert (Gegenstueck zu
# `openssl rand -hex 64`, das es unter Windows nicht gibt).
#
# Bewusst Create()+GetBytes() statt RandomNumberGenerator::Fill(): Fill gibt
# es erst ab .NET Core 3.0, und Windows PowerShell 5.1 — die Version, die auf
# jedem Windows vorinstalliert ist — laeuft auf .NET Framework. Dort waere
# das Skript sonst genau an dieser Zeile gestorben.
$bytes = New-Object byte[] 64
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$jwtSecret = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$envLines = @(
    "# Tesla Carview - erzeugt von deploy\setup-windows.ps1 am $stamp"
    ''
    'PORT=3000'
    "JWT_SECRET=$jwtSecret"
    ''
    "FRONTEND_URL=$AppUrl"
    ''
    '# Aus dem Tesla Developer Portal (docs/04-tesla-api.md).'
    '# Leer lassen und spaeter im Admin-Wizard eintragen ist ebenfalls moeglich.'
    'TESLA_CLIENT_ID='
    'TESLA_CLIENT_SECRET='
    "TESLA_REDIRECT_URI=$AppUrl/api/auth/callback"
    'TESLA_AUTH_BASE=https://auth.tesla.com/oauth2/v3'
    'TESLA_AUDIENCE=https://fleet-api.prd.eu.vn.cloud.tesla.com'
    ''
    'DB_PATH=./data/tesla-carview.db'
    'ENABLE_POLLER=true'
    ''
    '# Signed Commands laufen ueber den tesla-http-proxy. Der ist unter'
    '# Windows abgeschaltet (siehe docker-compose.override.yml). Wer ihn'
    '# doch betreibt: unter Docker Desktop gewinnt der eingebaute'
    '# /etc/hosts-Eintrag host.docker.internal gegen den Netzwerk-Alias,'
    '# deshalb hier den Containernamen setzen:'
    '# TESLA_PROXY_BASE=https://tesla-carview-proxy:4443'
)

# Bewusst LF ohne BOM. Compose kaeme zwar auch mit CRLF und BOM zurecht
# (nachgemessen), aber eine .env, die jedes Werkzeug gleich liest, spart
# spaeter Fehlersuche an einer Stelle, an der niemand sie vermutet.
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($EnvFile, ($envLines -join "`n") + "`n", $utf8NoBom)
Write-Ok "Konfiguration geschrieben: $EnvFile"

# ---------------------------------------------------------------------------
# 3) Override fuer Windows erzeugen
# ---------------------------------------------------------------------------
Write-Step 'Windows-Override erzeugen'

$ollamaBlock = if ($WithOllama) {
    @('  # Ollama laeuft mit (mindestens 4 GB RAM einplanen).')
} else {
    @(
        '  # Ollama aus: spart 2 GB RAM. Zum Aktivieren diesen Block loeschen'
        '  # und den Stack neu starten.'
        '  ollama:'
        '    profiles: [disabled]'
    )
}

$overrideLines = @(
    '# Windows-Anpassungen - erzeugt von deploy\setup-windows.ps1'
    '#'
    '# tesla-proxy braucht den Linux-Bind-Mount /etc/tesla-proxy und die feste'
    '# UID 988; beides gibt es unter Windows nicht. Der Service bleibt deshalb'
    '# aus. Folge: Fahrzeugbefehle (Signed Commands) funktionieren nicht,'
    '# Fahrten, Ladevorgaenge, Auswertungen und Fahrtenbuch schon.'
    '#'
    '# Das Backend startet trotzdem, weil depends_on in'
    '# docker-compose.prod.yml auf `required: false` steht.'
    'services:'
    '  tesla-proxy:'
    '    profiles: [disabled]'
) + $ollamaBlock

[System.IO.File]::WriteAllText($OverrideFile, ($overrideLines -join "`n") + "`n", $utf8NoBom)
Write-Ok "Override geschrieben: $OverrideFile"

# ---------------------------------------------------------------------------
# 4) Stack starten
# ---------------------------------------------------------------------------
Write-Step 'Container starten (erster Lauf laedt die Images, das dauert)'

Push-Location $RepoRoot
try {
    docker compose -f docker-compose.prod.yml -f docker-compose.override.yml up -d
    if ($LASTEXITCODE -ne 0) { Fail 'Der Container-Start ist fehlgeschlagen - Ausgabe oben pruefen.' }
} finally {
    Pop-Location
}

Write-Host ''
Write-Ok 'Stack laeuft'
Write-Host ''
Write-Host '  Naechste Schritte:' -ForegroundColor White
Write-Host "  1. Im Browser oeffnen: $AppUrl"
Write-Host '  2. Ersten Admin anlegen (Setup-Assistent)'
Write-Host '  3. Tesla-Zugang im Admin-Wizard hinterlegen (docs/04-tesla-api.md)'
Write-Host ''
Write-Host '  Status:  docker compose -f docker-compose.prod.yml -f docker-compose.override.yml ps'
Write-Host '  Logs:    docker compose -f docker-compose.prod.yml -f docker-compose.override.yml logs -f backend'
Write-Host '  Stoppen: docker compose -f docker-compose.prod.yml -f docker-compose.override.yml down'
Write-Host ''
Write-Warn 'Updates laufen unter Windows nicht ueber deploy/update.sh, sondern ueber: git pull + docker compose ... pull + up -d'
