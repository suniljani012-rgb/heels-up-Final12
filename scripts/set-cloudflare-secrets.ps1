# scripts/set-cloudflare-secrets.ps1
# This script prompts the user for keys and uploads them directly to their Cloudflare Worker secrets.

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

$env:PATH="C:\Users\Cyrix HealthCare\Desktop\All Heelsup\heels-up-Final\node-v22.14.0-win-x64;" + $env:PATH

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Gold
Write-Host "           HEELSUP CLOUDFLARE SECRETS UPLOADER" -ForegroundColor Gold
Write-Host "==========================================================" -ForegroundColor Gold
Write-Host "This script will prompt you for your API keys and securely"
Write-Host "upload them to your live Cloudflare Worker using Wrangler."
Write-Host ""

$rzpId = Read-Host "1. Enter Razorpay Live Key ID (e.g., rzp_live_xxxxxxxxxxxxxx)"
if ([string]::IsNullOrWhiteSpace($rzpId)) {
    Write-Host "Skipping Razorpay Key ID..." -ForegroundColor Yellow
} else {
    Write-Host "Uploading RAZORPAY_KEY_ID to Cloudflare..." -ForegroundColor Cyan
    $rzpId.Trim() | npx wrangler secret put RAZORPAY_KEY_ID
}

Write-Host ""
$rzpSecret = Read-Host "2. Enter Razorpay Live Key Secret"
if ([string]::IsNullOrWhiteSpace($rzpSecret)) {
    Write-Host "Skipping Razorpay Key Secret..." -ForegroundColor Yellow
} else {
    Write-Host "Uploading RAZORPAY_KEY_SECRET to Cloudflare..." -ForegroundColor Cyan
    $rzpSecret.Trim() | npx wrangler secret put RAZORPAY_KEY_SECRET
}

Write-Host ""
$infobipKey = Read-Host "3. Enter Infobip API Key"
if ([string]::IsNullOrWhiteSpace($infobipKey)) {
    Write-Host "Skipping Infobip API Key..." -ForegroundColor Yellow
} else {
    Write-Host "Uploading INFOBIP_API_KEY to Cloudflare..." -ForegroundColor Cyan
    $infobipKey.Trim() | npx wrangler secret put INFOBIP_API_KEY
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "      Upload Completed! Secrets are now live on Cloudflare." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
