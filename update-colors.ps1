#!/usr/bin/env pwsh

# Batch update common color patterns across the codebase
# This script replaces old slate/blue/indigo colors with the new lavender/teal/coral palette

$replacements = @(
    # Text colors
    @{Old = 'text-slate-800'; New = 'text-text-primary'},
    @{Old = 'text-slate-700'; New = 'text-text-secondary'},
    @{Old = 'text-slate-600'; New = 'text-text-secondary'},
    @{Old = 'text-slate-500'; New = 'text-text-light'},
    @{Old = 'text-slate-400'; New = 'text-text-light'},
    
    # Background colors  
    @{Old = 'bg-slate-100'; New = 'bg-primary-50'},
    @{Old = 'bg-slate-50'; New = 'bg-primary-50'},
    @{Old = 'bg-blue-50'; New = 'bg-secondary-50'},
    @{Old = 'bg-indigo-50'; New = 'bg-primary-50'},
    @{Old = 'bg-indigo-600'; New = 'bg-primary'},
    @{Old = 'bg-indigo-700'; New = 'bg-primary-dark'},
    
    # Border colors
    @{Old = 'border-slate-200'; New = 'border-primary-200'},
    @{Old = 'border-slate-300'; New = 'border-primary-200'},
    @{Old = 'border-blue-200'; New = 'border-secondary/30'},
    
    # Hover states
    @{Old = 'hover:bg-slate-100'; New = 'hover:bg-primary-50'},
    @{Old = 'hover:text-slate-600'; New = 'hover:text-text-secondary'},
    @{Old = 'hover:bg-indigo-700'; New = 'hover:bg-primary-dark'},
    
    # Focus rings
    @{Old = 'focus:ring-indigo-500'; New = 'focus:ring-primary'},
    @{Old = 'focus:ring-blue-500'; New = 'focus:ring-secondary'}
)

$searchPath = "c:\Users\lenovo\VNIT_GIRL'S_SAFETY\src"
$filePattern = "*.tsx", "*.ts"

Write-Host "Starting color palette update..." -ForegroundColor Cyan

foreach ($pattern in $filePattern) {
    $files = Get-ChildItem -Path $searchPath -Filter $pattern -Recurse -File
    
    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        $modified = $false
        
        foreach ($replacement in $replacements) {
            if ($content -match [regex]::Escape($replacement.Old)) {
                $content = $content -replace [regex]::Escape($replacement.Old), $replacement.New
                $modified = $true
            }
        }
        
        if ($modified) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "✓ Updated: $($file.Name)" -ForegroundColor Green
        }
    }
}

Write-Host "`nColor palette update complete!" -ForegroundColor Cyan
