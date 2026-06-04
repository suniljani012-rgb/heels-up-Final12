Write-Host '=== HeelsUp Migration Verification ===' -ForegroundColor Cyan

$checks = @(
    'public/_headers',
    'public/_redirects',
    'public/sitemap.xml',
    'public/img/README.md',
    'docs/ARCHITECTURE.md',
    'docs/SECURITY.md',
    '.dev.vars.example',
    'public/js/core/config.js',
    'public/js/core/api-client.js',
    'public/js/admin/dashboard.js',
    'public/js/admin/enterprise.js',
    'scripts/fixes/get_product.sql',
    'schema/seeds/seed_products.sql'
)

Write-Host ''
Write-Host '--- New Files Created ---' -ForegroundColor Yellow
foreach ($f in $checks) {
    if (Test-Path $f) {
        $sz = (Get-Item $f).Length
        Write-Host "  [OK]  $f  ($sz bytes)" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING]  $f" -ForegroundColor Red
    }
}

Write-Host ''
Write-Host '--- Old Files (should be small stubs) ---' -ForegroundColor Yellow
$stubs = @(
    'public/app-config.js',
    'public/app-auth.js',
    'public/dashboard.js',
    'public/admin-enterprise.js'
)
foreach ($f in $stubs) {
    if (Test-Path $f) {
        $sz = (Get-Item $f).Length
        Write-Host "  [STUB]  $f  ($sz bytes)" -ForegroundColor Cyan
    }
}

Write-Host ''
Write-Host '--- HTML Reference Counts ---' -ForegroundColor Yellow
$html = Get-ChildItem 'public/*.html'
$cfg  = ($html | Select-String 'js/core/config'     | Measure-Object).Count
$api  = ($html | Select-String 'js/core/api-client' | Measure-Object).Count
$dash = ($html | Select-String 'js/admin/dashboard' | Measure-Object).Count
$ent  = ($html | Select-String 'js/admin/enterprise'| Measure-Object).Count
$oldA = ($html | Select-String 'src="app-auth'      | Measure-Object).Count
$oldC = ($html | Select-String 'src="app-config'    | Measure-Object).Count

Write-Host "  js/core/config.js:       $cfg HTML pages" -ForegroundColor Green
Write-Host "  js/core/api-client.js:   $api HTML pages" -ForegroundColor Green
Write-Host "  js/admin/dashboard.js:   $dash HTML pages" -ForegroundColor Green
Write-Host "  js/admin/enterprise.js:  $ent HTML pages" -ForegroundColor Green
Write-Host ''
$col = if ($oldA -eq 0) { 'Green' } else { 'Red' }
Write-Host "  OLD app-auth.js src=:   $oldA (must be 0)" -ForegroundColor $col
$col2 = if ($oldC -eq 0) { 'Green' } else { 'Red' }
Write-Host "  OLD app-config.js src=: $oldC (must be 0)" -ForegroundColor $col2

Write-Host ''
Write-Host '=== Done ===' -ForegroundColor Cyan
