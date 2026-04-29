<#
.SYNOPSIS
  CRM Analiz - Windows-side push, secret bootstrap, CI watcher.

.DESCRIPTION
  Idempotent. Single command:
    1. Check gh auth, prompt login if missing
    2. Rewrite origin remote (sandbox left it as f:/...) to GitHub
    3. Push main + branches + tags (first main push uses --force-with-lease)
    4. Bootstrap PII_MASTER_KEY and SESSION_SIGNING_KEY GitHub secrets if
       missing (values never printed)
    5. Watch CI run with --exit-status
    6. Summarize

  Non-generatable secrets (DATABASE_URL, ISSMANAGER_*) are left as
  DEPLOYMENT BLOCKER and listed by name only.

.PARAMETER Repo
  Target GitHub repo (default: bybinbir/crm). Bullvar/WISP/ISSCRMANALIZ
  are hard-rejected by the guardrail.

.PARAMETER WatchCi
  Watch the CI run after push (default: true).

.NOTES
  ASCII-only on purpose: Windows PowerShell 5.1 reads .ps1 files in the
  current console code page (often Win-1252/1254). Non-ASCII characters
  without a BOM break the parser. Keep this file ASCII.
#>
[CmdletBinding()]
param(
  [string]$Repo = "bybinbir/crm",
  [switch]$WatchCi = $true
)

$ErrorActionPreference = "Stop"
$script:Failed = $false
$script:MissingSecrets = @()

function Step([string]$Title, [scriptblock]$Body) {
  Write-Host ""
  Write-Host "-- $Title --" -ForegroundColor Cyan
  try {
    & $Body
  } catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
    $script:Failed = $true
    throw
  }
}

# 0. Guardrail: never touch the wrong repo.
if ($Repo -match "bullvar|wisp|ISSCRMANALIZ") {
  throw "REFUSING: '$Repo' is not allowed (Bullvar/WISP/ISSCRMANALIZ). Expected CRM_REPO=bybinbir/crm."
}

# 1. Repo root sanity.
Step "Repo root check" {
  if (-not (Test-Path ".git")) {
    throw "Not a git repo. Run: cd F:\GG\Projeler\crmanaliz"
  }
  $branch = git branch --show-current
  Write-Host "  branch     : $branch"
  Write-Host "  HEAD       : $(git rev-parse --short HEAD)"
  Write-Host "  main       : $(git rev-parse --short main)"
  Write-Host "  v0.4.0     : $(git rev-parse --short v0.4.0^{commit})"
  Write-Host "  v0.5.0     : $(git rev-parse --short v0.5.0^{commit})"
}

# 2. gh auth.
Step "gh auth status" {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "gh CLI is not installed. Install from https://cli.github.com and re-run."
  }
  $authOut = gh auth status 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  gh login required. Starting interactive login..." -ForegroundColor Yellow
    gh auth login --hostname github.com --git-protocol https --web
    if ($LASTEXITCODE -ne 0) { throw "gh auth login failed" }
  } else {
    Write-Host "  gh auth: PASS"
  }
}

# 3. Repo access.
Step "Repo access: $Repo" {
  $info = gh repo view $Repo --json nameWithOwner,defaultBranchRef,isPrivate 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Cannot access $Repo. Check ownership / gh auth."
  }
  Write-Host "  $info"
}

# 4. Origin remote.
Step "Origin remote -> https://github.com/$Repo.git" {
  $current = (git remote get-url origin) 2>$null
  $target = "https://github.com/$Repo.git"
  if ($current -eq $target) {
    Write-Host "  already correct: $current"
  } elseif ($current) {
    if ($current -match "^[a-z]:/" -or $current -match "^[a-z]:\\") {
      Write-Host "  moving local origin to local-origin: $current"
      git remote rename origin local-origin 2>$null
      git remote add origin $target
    } else {
      git remote set-url origin $target
    }
    Write-Host "  new: $target"
  } else {
    git remote add origin $target
    Write-Host "  added: $target"
  }
  git remote -v | Where-Object { $_ -match "origin" } | ForEach-Object { Write-Host "  $_" }
}

# 5. Push.
Step "Push: main (--force-with-lease for first push)" {
  git push origin main --force-with-lease
  if ($LASTEXITCODE -ne 0) { throw "main push failed" }
}

Step "Push: feature branches + tags" {
  git push origin feat/m1-fresh-build feature/m5-operational-hardening
  if ($LASTEXITCODE -ne 0) { throw "feat branches push failed" }
  git push origin feature/m6-export-reports feature/m6-e2e-playwright
  if ($LASTEXITCODE -ne 0) { throw "feature/m6 branches push failed" }
  git push origin v0.4.0 v0.5.0
  if ($LASTEXITCODE -ne 0) { throw "tag push failed" }
}

Step "Push verification (ls-remote)" {
  $expected = @{
    "refs/heads/main"                              = "1095761"
    "refs/heads/feature/m6-e2e-playwright"         = "37071de"
    "refs/heads/feature/m6-export-reports"         = "83d746f"
    "refs/heads/feature/m5-operational-hardening"  = "1095761"
    "refs/tags/v0.4.0"                             = $null
    "refs/tags/v0.5.0"                             = $null
  }
  foreach ($ref in $expected.Keys) {
    $line = (git ls-remote origin $ref 2>$null) -split "\s+"
    $sha = if ($line.Count -ge 1 -and $line[0]) { $line[0].Substring(0, 7) } else { "(missing)" }
    $exp = $expected[$ref]
    $ok = if ($null -eq $exp) { $sha -ne "(missing)" } else { $sha -eq $exp }
    $tag = if ($ok) { "OK" } else { "FAIL" }
    $color = if ($ok) { "Green" } else { "Red" }
    Write-Host ("  {0,-50} {1}  ({2})" -f $ref, $sha, $tag) -ForegroundColor $color
    if (-not $ok) { $script:Failed = $true }
  }
}

# 6. Secrets.
Step "GitHub Actions secrets (names only)" {
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

Step "Bootstrap generatable secrets (PII_MASTER_KEY, SESSION_SIGNING_KEY)" {
  foreach ($name in @("PII_MASTER_KEY", "SESSION_SIGNING_KEY")) {
    if ($script:MissingSecrets -contains $name) {
      $value = node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
      if ([string]::IsNullOrWhiteSpace($value)) { throw "$name generation failed (node -e)" }
      $value | gh secret set $name --repo $Repo
      Remove-Variable value -ErrorAction SilentlyContinue
      Write-Host "  $name : SET (value not printed)"
    }
  }
  $still = gh secret list --repo $Repo | Out-String
  Write-Host "  Final secret list:"
  $nl = [Environment]::NewLine
  ($still -split $nl) | Where-Object { $_ -match "_KEY|_URL|_ID|_SECRET" } | ForEach-Object { Write-Host "    $_" }
}

# Report deployment blockers (non-generatable secrets).
$externalNames = @("DATABASE_URL", "ISSMANAGER_BASE_URL", "ISSMANAGER_CLIENT_ID", "ISSMANAGER_CLIENT_SECRET")
$externalMissing = @()
foreach ($n in $externalNames) {
  if ($script:MissingSecrets -contains $n) { $externalMissing += $n }
}
if ($externalMissing.Count -gt 0) {
  Write-Host ""
  Write-Host "DEPLOYMENT BLOCKER - these secrets must come from prod:" -ForegroundColor Yellow
  foreach ($n in $externalMissing) { Write-Host "  - $n" -ForegroundColor Yellow }
  Write-Host "  Cannot be generated by sandbox or this script."
}

# 7. CI run watch.
if ($WatchCi) {
  Step "CI run watch (latest run on feature/m6-e2e-playwright)" {
    Start-Sleep -Seconds 5
    $runs = gh run list --repo $Repo --branch feature/m6-e2e-playwright --limit 5 --json databaseId,status,conclusion,headSha,name 2>$null
    if (-not $runs) {
      Write-Host "  No run visible yet. Workflow trigger correct?"
      return
    }
    $latest = ($runs | ConvertFrom-Json | Select-Object -First 1)
    if (-not $latest) { Write-Host "  No run found"; return }
    Write-Host "  Run #$($latest.databaseId) - $($latest.name) - status=$($latest.status)"
    gh run watch $latest.databaseId --repo $Repo --exit-status
    if ($LASTEXITCODE -ne 0) {
      Write-Host "  CI FAIL - last 80 log lines:" -ForegroundColor Red
      gh run view $latest.databaseId --repo $Repo --log | Select-Object -Last 80
      $script:Failed = $true
    } else {
      Write-Host "  CI PASS" -ForegroundColor Green
    }
  }
} else {
  Write-Host ""
  Write-Host "WatchCi:false - CI watch skipped." -ForegroundColor Gray
}

# 8. Summary.
Write-Host ""
Write-Host "============================================================"
if ($script:Failed) {
  Write-Host "Result: FAILED - follow the red lines above." -ForegroundColor Red
  exit 1
} else {
  Write-Host "Result: PASS - push + secrets + CI run green." -ForegroundColor Green
  if ($externalMissing.Count -gt 0) {
    Write-Host "Note: external prod secrets still missing. Add them before deploy preflight." -ForegroundColor Yellow
    exit 2
  }
  exit 0
}
