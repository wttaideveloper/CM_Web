param(
  [string]$AppHost = "http://localhost:3000",
  [string]$Token = "",
  [string]$BadToken = ""
)

$ErrorActionPreference = "Continue"

$script:pass = 0
$script:fail = 0

function Test-Check([string]$name, [int]$expected, [int]$actual, [string]$extra = "") {
  if ($expected -eq $actual) {
    $script:pass++
    Write-Host "PASS  $name (HTTP $actual) $extra"
  } else {
    $script:fail++
    Write-Host "FAIL  $name (expected HTTP $expected, got $actual) $extra"
  }
}

$base = "$AppHost/chat-api"
$tmp = "C:\Users\User\AppData\Local\Temp\opencode"

Write-Host "Target: $base"

Write-Host "`n== T1: no cookie -> 401 =="
$code = curl.exe -s -o NUL -w "%{http_code}" "$base/conversations/provider" --max-time 30
Test-Check "T1 no cookie" 401 ([int]$code)

if ($Token) {
  Write-Host "`n== T2: valid cookie -> 200 (provider inbox) =="
  $code = curl.exe -s -o "$tmp\gateway-t2.json" -w "%{http_code}" "$base/conversations/provider" -H "Cookie: access_token=$Token" --max-time 30
  Test-Check "T2 provider inbox" 200 ([int]$code)

  Write-Host "`n== T3: valid cookie -> 200 (conversations list) =="
  $code = curl.exe -s -o NUL -w "%{http_code}" "$base/conversations/" -H "Cookie: access_token=$Token" --max-time 30
  Test-Check "T3 conversations list" 200 ([int]$code)
}

if ($BadToken) {
  Write-Host "`n== T4: expired/invalid cookie -> 401 =="
  $code = curl.exe -s -o NUL -w "%{http_code}" "$base/conversations/provider" -H "Cookie: access_token=$BadToken" --max-time 30
  Test-Check "T4 bad token" 401 ([int]$code)
}

Write-Host "`n== T5: write method passthrough (only when -RunWrite used) =="
Write-Host "SKIP  T5 (re-enable to POST /chat-api/messages with a real conversation)"

Write-Host "`n== T6: cookie stripped upstream =="
Write-Host "SKIP  T6 (verify 'Cookie' header is absent in upstream access logs)"

Write-Host "`nResult: $($script:pass) passed, $($script:fail) failed"
if ($script:fail -gt 0) { exit 1 }