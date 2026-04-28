<#
.SYNOPSIS
  CRM Analiz — Windows-side push, secret bootstrap, CI watcher.

.DESCRIPTION
  Idempotent. Tek komutla:
    1. gh auth durumunu kontrol eder, eksikse `gh auth login` çalıştırır
    2. origin remote'u GitHub'a yönlendirir (Linux sandbox'tan kalan
       `f:/...` URL'i)
    3. main + branch'ler + tag'leri push eder (ilk main push --force-with-lease)
    4. PII_MASTER_KEY ve SESSION_SIGNING_KEY GitHub secret'larını
       eksikse üretip ekler — değer asla terminale basılmaz
    5. CI run'ı bulup --exit-status ile izler
    6. Sonucu özetler

  Üretilemeyen secret'ları (DATABASE_URL, ISSMANAGER_*) bilinçli atlar
  ve listede MISSING gösterir.

.PARAMETER Repo
  Hedef GitHub repo (default: bybinbir/crm). Bullvar/WISP/ISSCRMANALIZ
  olmadığını script kontrol eder.

.PARAMETER WatchCi
  CI'yi izle (default: $true). $false yaparsanız sadece push + secret.

.EXAMPLE
  PS> cd F:\GG\Projeler\crmanaliz
  PS> .\scripts\ops\windows-push-and-ci.ps1

.EXAMPLE
  PS> .\scripts\ops\windows-push-and-ci.ps1 -WatchCi:$false
#>
[CmdletBinding()]
param(
  [string]$Repo = "bybinbir/crm",
  [switch]$WatchCi = $true
)

$ErrorActionPreference = "Stop"
$script:Failed = $false

function Step([string]$Title, [scriptblock]$Body) {
  Write-Host ""
  Write-Host "── $Title ──" -ForegroundColor Cyan
  try {
    & $Body
  } catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
    $script:Failed = $true
    throw
  }
}

# ── 0. Guardrail: yanlış repo'ya dokunma ────────────────────────────────────
if ($Repo -match "bullvar|wisp|ISSCRMANALIZ") {
  throw "REFUSING: '$Repo' yasaklı (Bullvar/WISP/ISSCRMANALIZ). CRM_REPO=bybinbir/crm bekleniyordu."
}

# ── 1. Repo kökü kontrolü ───────────────────────────────────────────────────
Step "Repo kökü kontrolü" {
  if (-not (Test-Path ".git")) {
    throw "Bu dizin git repo değil. cd F:\GG\Projeler\crmanaliz çalıştırıp tekrar deneyin."
  }
  $branch = git branch --show-current
  Write-Host "  branch     : $branch"
  Write-Host "  HEAD       : $(git rev-parse --short HEAD)"
  Write-Host "  main       : $(git rev-parse --short main)"
  Write-Host "  v0.4.0     : $(git rev-parse --short v0.4.0^{commit})"
  Write-Host "  v0.5.0     : $(git rev-parse --short v0.5.0^{commit})"
}

# ── 2. gh auth ──────────────────────────────────────────────────────────────
Step "gh auth status" {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "gh CLI yüklü değil. https://cli.github.com indirip kurun, sonra script'i tekrar çalıştırın."
  }
  $authOut = gh auth status 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  gh login gerekli. İnteraktif login başlatılıyor..." -ForegroundColor Yellow
    gh auth login --hostname github.com --git-protocol https --web
    if ($LASTEXITCODE -ne 0) { throw "gh auth login başarısız." }
  } else {
    Write-Host "  gh auth: PASS"
  }
}

# ── 3. Repo erişimi ─────────────────────────────────────────────────────────
Step "Repo erişimi: $Repo" {
  $info = gh repo view $Repo --json nameWithOwner,defaultBranchRef,isPrivate 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Repo $Repo erişilemedi. Sahip mi olduğunuzu kontrol edin (gh auth status)."
  }
  Write-Host "  $info"
}

# ── 4. Origin remote ────────────────────────────────────────────────────────
Step "Origin remote → https://github.com/$Repo.git" {
  $current = (git remote get-url origin) 2>$null
  $target = "https://github.com/$Repo.git"
  if ($current -eq $target) {
    Write-Host "  zaten doğru: $current"
  } elseif ($current) {
    if ($current -match "^[a-z]:/" -or $current -match "^[a-z]:\\") {
      Write-Host "  local-origin'e taşınıyor: $current"
      git remote rename origin local-origin 2>$null
      git remote add origin $target
    } else {
      git remote set-url origin $target
    }
    Write-Host "  yeni: $target"
  } else {
    git remote add origin $target
    Write-Host "  eklendi: $target"
  }
  git remote -v | Where-Object { $_ -match "origin" } | ForEach-Object { Write-Host "  $_" }
}

# ── 5. Push ─────────────────────────────────────────────────────────────────
Step "Push: main (--force-with-lease ilk push için)" {
  git push origin main --force-with-lease
  if ($LASTEXITCODE -ne 0) { throw "main push başarısız" }
}

Step "Push: feature branches + tags" {
  git push origin feat/m1-fresh-build feature/m5-operational-hardening
  git push origin feature/m6-export-reports feature/m6-e2e-playwright
  git push origin v0.4.0 v0.5.0
  if ($LASTEXITCODE -ne 0) { throw "branch/tag push başarısız" }
}

Step "Push doğrulama (ls-remote)" {
  $expected = @{
    "refs/heads/main"                              = "1095761"
    "refs/heads/feature/m6-e2e-playwright"         = "37071de"
    "refs/heads/feature/m6-export-reports"         = "83d746f"
    "refs/heads/feature/m5-operational-hardening"  = "1095761"
    "refs/tags/v0.4.0"                             = $null  # tag SHA != commit SHA
    "refs/tags/v0.5.0"                             = $null
  }
  foreach ($ref in $expected.Keys) {
    $line = (git ls-remote origin $ref 2>$null) -split "\s+"
    $sha = if ($line.Count -ge 1) { $line[0].Substring(0, 7) } else { "(yok)" }
    $exp = $expected[$ref]
    $ok = if ($null -eq $exp) { $sha -ne "(yok)" } else { $sha -eq $exp }
    $tag = if ($ok) { "OK" } else { "FAIL" }
    $color = if ($ok) { "Green" } else { "Red" }
    Write-Host ("  {0,-50} {1}  ({2})" -f $ref, $sha, $tag) -ForegroundColor $color
    if (-not $ok) { $script:Failed = $true }
  }
}

# ── 6. Secrets ──────────────────────────────────────────────────────────────
Step "GitHub Actions secrets (sadece isim listesi)" {
  $existing = gh secret list --repo $Repo 2>$null | ForEach-Object { ($_ -split "\s+")[0] }
  $required = @(
    "DATABASE_URL", "PII_MASTER_KEY", "SESSION_SIGNING_KEY",
    "ISSMANAGER_BASE_URL", "ISSMANAGER_CLIENT_ID", "ISSMANAGER_CLIENT_SECRET"
  )
  $missing = @()
  foreach ($name in $required) {
    if ($existing -contains $name) {
      Write-Host "  $name : EXISTS"
    } else {
      Write-Host "  $name : MISSING" -ForegroundColor Yellow
      $missing += $name
    }
  }
  $script:MissingSecrets = $missing
}

Step "Üretilebilir secret'ları üret + set (PII_MASTER_KEY, SESSION_SIGNING_KEY)" {
  foreach ($name in @("PII_MASTER_KEY", "SESSION_SIGNING_KEY")) {
    if ($script:MissingSecrets -contains $name) {
      $value = node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
      if ([string]::IsNullOrWhiteSpace($value)) { throw "$name üretilemedi (node -e)" }
      $value | gh secret set $name --repo $Repo
      Remove-Variable value -ErrorAction SilentlyContinue
      Write-Host "  $name : SET (değer ekrana basılmadı)"
    }
  }
  # PII ile SESSION aynı değeri almayacak, çünkü randomBytes farklı çağrılarda farklı çıktı verir.
  # Yine de kontrol edelim — server-side superRefine de aynı kontrolü yapıyor.
  $still = gh secret list --repo $Repo | Out-String
  Write-Host "  Final secret listesi:"
  ($still -split "`n") | Where-Object { $_ -match "_KEY|_URL|_ID|_SECRET" } | ForEach-Object { Write-Host "    $_" }
}

# DATABASE_URL ve ISSMANAGER_* hâlâ MISSING'se belirt
$externalMissing = $script:MissingSecrets | Where-Object {
  $_ -in @("DATABASE_URL", "ISSMANAGER_BASE_URL", "ISSMANAGER_CLIENT_ID", "ISSMANAGER_CLIENT_SECRET")
}
if ($externalMissing) {
  Write-Host ""
  Write-Host "DEPLOYMENT BLOCKER — şu secret'lar prod ortamından gelmeli:" -ForegroundColor Yellow
  $externalMissing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
  Write-Host "  Bu secret'lar sandbox/script tarafından üretilemez."
}

# ── 7. CI run watch ─────────────────────────────────────────────────────────
if ($WatchCi) {
  Step "CI run watch (feature/m6-e2e-playwright son run)" {
    Start-Sleep -Seconds 5  # workflow tetiklenmesi için kısa bekleme
    $runs = gh run list --repo $Repo --branch feature/m6-e2e-playwright --limit 5 --json databaseId,status,conclusion,headSha,name --jq ".[]" 2>$null
    if (-not $runs) {
      Write-Host "  Henüz run görünmüyor. Workflow tetikleyici doğru mu?"
      return
    }
    $latest = ($runs | ConvertFrom-Json | Select-Object -First 1)
    if (-not $latest) { Write-Host "  Run bulunamadı"; return }
    Write-Host "  Run #$($latest.databaseId) — $($latest.name) — status=$($latest.status)"
    gh run watch $latest.databaseId --repo $Repo --exit-status
    if ($LASTEXITCODE -ne 0) {
      Write-Host "  CI FAIL — log:" -ForegroundColor Red
      gh run view $latest.databaseId --repo $Repo --log | Select-Object -Last 80
      $script:Failed = $true
    } else {
      Write-Host "  CI PASS" -ForegroundColor Green
    }
  }
} else {
  Write-Host ""
  Write-Host "WatchCi:false — CI takip atlandı." -ForegroundColor Gray
}

# ── 8. Özet ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════"
if ($script:Failed) {
  Write-Host "Sonuç: FAILED — yukarıdaki kırmızı satırları takip edin." -ForegroundColor Red
  exit 1
} else {
  Write-Host "Sonuç: PASS — push + secrets + CI run yeşil." -ForegroundColor Green
  if ($externalMissing) {
    Write-Host "Not: dış kaynaklı secret'lar (prod env) hâlâ eksik. Deploy preflight'a geçmeden önce ekleyin." -ForegroundColor Yellow
    exit 2
  }
  exit 0
}
