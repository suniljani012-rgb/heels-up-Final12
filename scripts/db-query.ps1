# ============================================================
# HeelsUp — Cloudflare D1 Database Query Utility
# ============================================================
# Usage:
#   .\scripts\db-query.ps1 "SELECT * FROM products LIMIT 5"
#   .\scripts\db-query.ps1 -Sql "SELECT COUNT(*) FROM users" -Format Table
#   .\scripts\db-query.ps1 -Sql "SELECT * FROM orders" -Format Json
# ============================================================

param(
    [Parameter(Position=0, Mandatory=$true)]
    [string]$Sql,
    
    [ValidateSet("Table", "Json", "Raw")]
    [string]$Format = "Table"
)

# ── Cloudflare D1 Credentials ──────────────────────────────────
$AccountId  = ""
$DatabaseId = "e1421396-862d-4be9-bc68-72ce70b1644c"
$AuthEmail  = "jaykarwani111@gmail.com"
$AuthKey    = ""

# Load from .dev.vars if present
$DevVarsPath = Join-Path $PSScriptRoot "..\.dev.vars"
if (Test-Path $DevVarsPath) {
    Get-Content $DevVarsPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line -split '=', 2
            if ($parts.Length -eq 2) {
                $k = $parts[0].Trim()
                $v = $parts[1].Trim()
                if ($k -eq "CLOUDFLARE_ACCOUNT_ID") { $AccountId = $v }
                elseif ($k -eq "CLOUDFLARE_API_TOKEN") { $AuthKey = $v }
            }
        }
    }
}

if (-not $AccountId -or -not $AuthKey) {
    Write-Error "Cloudflare credentials not found in .dev.vars. Please verify your config."
    exit 1
}

$Uri = "https://api.cloudflare.com/client/v4/accounts/$AccountId/d1/database/$DatabaseId/query"

$Headers = @{
    "X-Auth-Email" = $AuthEmail
    "X-Auth-Key"   = $AuthKey
    "Content-Type" = "application/json"
}

$Body = @{ sql = $Sql } | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $Uri -Method POST -Headers $Headers -Body $Body -ErrorAction Stop
    
    if ($response.success -eq $true) {
        $results = $response.result[0].results
        $meta    = $response.result[0].meta
        
        Write-Host "`n✅ Query executed successfully" -ForegroundColor Green
        Write-Host "   Rows: $($results.Count) | Duration: $($meta.duration)ms | Region: $($meta.served_by_region)" -ForegroundColor DarkGray
        Write-Host ""
        
        switch ($Format) {
            "Table" { $results | Format-Table -AutoSize }
            "Json"  { $results | ConvertTo-Json -Depth 10 }
            "Raw"   { $response | ConvertTo-Json -Depth 10 }
        }
    } else {
        Write-Host "`n❌ Query failed:" -ForegroundColor Red
        $response.errors | ForEach-Object { Write-Host "   $($_.message)" -ForegroundColor Red }
    }
} catch {
    $errorBody = $null
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
    } catch {}
    
    if ($errorBody) {
        Write-Host "`n❌ API Error:" -ForegroundColor Red
        $errorBody.errors | ForEach-Object { Write-Host "   $($_.message)" -ForegroundColor Red }
    } else {
        Write-Host "`n❌ Connection Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
