param(
  [string]$Root = ".\public",
  [switch]$Preview
)

# Patterns -> replacement
$patterns = @(
  @{ regex = 'headers\s*:\s*\{\s*[''"]Content-Type[''\"]\s*:\s*[''"]application/json[''\"]\s*,\s*Authorization\s*:\s*[^}]+\}'; repl = "headers: authHeaders('application/json')" },
  @{ regex = 'headers\s*:\s*\{\s*[''"]Authorization[''\"]\s*:\s*[^}]+\}'; repl = "headers: authHeaders()" },
  @{ regex = 'if \(token\)\s*headers\[[''"]Authorization[''"]\]\s*=\s*`[^`]+;'; repl = 'if (token) headers[''Authorization''] = `Bearer ${token}`;' }
)

$rootPath = Resolve-Path $Root
if (-not $rootPath) { Write-Error "Root path not found: $Root"; exit 1 }
$rootPath = $rootPath.ProviderPath

# backup folder
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$backupRoot = Join-Path (Split-Path -Parent $rootPath) "backups"
$backupDir = Join-Path $backupRoot "public-backup-$timestamp"

$files = Get-ChildItem -Path $rootPath -Recurse -Include *.html,*.js -File
$modified = @()
foreach ($f in $files) {
  $content = Get-Content $f.FullName -Raw -ErrorAction Stop
  $new = $content
  foreach ($p in $patterns) {
    $new = [Regex]::Replace($new, $p.regex, $p.repl, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  }
  if ($new -ne $content) {
    if ($Preview) {
      Write-Output "Would modify: $($f.FullName)"
      continue
    }
    # ensure backup dir + relative path
    $rel = $f.FullName.Substring($rootPath.Length).TrimStart('\')
    $destDir = Split-Path (Join-Path $backupDir $rel) -Parent
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    Copy-Item -Path $f.FullName -Destination (Join-Path $backupDir $rel) -Force
    # write updated content (preserve UTF8)
    Set-Content -Path $f.FullName -Value $new -Encoding UTF8
    $modified += $f.FullName
    Write-Output "Modified: $($f.FullName)"
  }
}

if (-not $Preview) {
  Write-Output ""
  Write-Output "Backup created at: $backupDir"
  Write-Output "Files modified: $($modified.Count)"
  foreach ($m in $modified) { Write-Output " - $m" }
} else {
  Write-Output ""
  Write-Output "Preview mode. Run without -Preview to apply changes and create backups."
}