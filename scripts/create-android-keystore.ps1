param(
  [string]$OutDir = "release",
  [string]$Alias = "sj-store-pro",
  [string]$Password
)

function New-AsciiSecret {
  $chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  $bytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RNGCryptoServiceProvider]::Create()
  $rng.GetBytes($bytes)
  $rng.Dispose()
  $secret = ""
  foreach ($b in $bytes) {
    $secret += $chars[$b % $chars.Length]
  }
  return $secret
}

$Password = if ($Password) { $Password } else { New-AsciiSecret }

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$targetDir = Join-Path $root $OutDir
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$keystore = Join-Path $targetDir "android-release-key.jks"
$base64File = Join-Path $targetDir "android-release-key.base64.txt"

keytool -genkeypair `
  -v `
  -storetype JKS `
  -keystore $keystore `
  -storepass $Password `
  -keypass $Password `
  -alias $Alias `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -dname "CN=SJ STORE, OU=SJ STORE, O=SJ STORE, L=Local, S=Local, C=DZ"

[Convert]::ToBase64String([IO.File]::ReadAllBytes($keystore)) | Set-Content -NoNewline -Encoding ASCII $base64File

Write-Output "Keystore: $keystore"
Write-Output "Base64 secret file: $base64File"
Write-Output "ANDROID_KEY_ALIAS=$Alias"

@(
  "ANDROID_KEYSTORE_BASE64=$(Get-Content -Raw -LiteralPath $base64File)",
  "ANDROID_KEYSTORE_PASSWORD=$Password",
  "ANDROID_KEY_ALIAS=$Alias",
  "ANDROID_KEY_PASSWORD=$Password"
) | Set-Content -Encoding ASCII (Join-Path $targetDir "android-github-secrets.txt")
