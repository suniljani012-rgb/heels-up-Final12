# HeelsUp — Batch HTML Reference Updater
# Updates all JS script src paths across all HTML pages

$publicDir = "c:\Users\Cyrix HealthCare\Desktop\other\heels-up-new\heelsup\public"

$replacements = @(
    # app-config.js -> js/core/config.js (relative and absolute forms)
    @{ Old = 'src="app-config.js"';           New = 'src="js/core/config.js"' },
    @{ Old = 'src="app-config.js" defer';     New = 'src="js/core/config.js" defer' },
    @{ Old = 'src="/app-config.js"';          New = 'src="/js/core/config.js"' },
    @{ Old = 'src="/app-config.js" defer';    New = 'src="/js/core/config.js" defer' },

    # app-auth.js -> js/core/api-client.js (relative and absolute forms)
    @{ Old = 'src="app-auth.js"';             New = 'src="js/core/api-client.js"' },
    @{ Old = 'src="app-auth.js" defer';       New = 'src="js/core/api-client.js" defer' },
    @{ Old = 'src="/app-auth.js"';            New = 'src="/js/core/api-client.js"' },
    @{ Old = 'src="/app-auth.js" defer';      New = 'src="/js/core/api-client.js" defer' },

    # dashboard.js -> js/admin/dashboard.js (only in admin.html root)
    @{ Old = 'src="dashboard.js"';            New = 'src="js/admin/dashboard.js"' },

    # admin-enterprise.js -> js/admin/enterprise.js
    @{ Old = 'src="admin-enterprise.js"';     New = 'src="js/admin/enterprise.js"' }
)

$htmlFiles = Get-ChildItem -Path $publicDir -Filter "*.html" -Recurse

$totalChanged = 0

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $changed = $false
    
    foreach ($r in $replacements) {
        if ($content.Contains($r.Old)) {
            $content = $content.Replace($r.Old, $r.New)
            $changed = $true
        }
    }
    
    if ($changed) {
        Set-Content -Path $file.FullName -Value $content -NoNewline -Encoding UTF8
        Write-Host "Updated: $($file.Name)"
        $totalChanged++
    }
}

Write-Host ""
Write-Host "Done! Updated $totalChanged HTML files."
