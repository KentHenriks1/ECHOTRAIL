# EchoTrail Pre-Commit Validation Script (PowerShell)
# Prevents any placeholder functionality from being committed

Write-Host "Validating NO placeholder functionality..." -ForegroundColor Cyan

# Define forbidden placeholder patterns (excluding TextInput placeholder props)
$ForbiddenPatterns = @(
    "coming soon",
    "kommer snart", 
    "available soon",
    "will be available",
    "under construction",
    "TODO.*later",
    "FIXME.*later"
)

# Placeholder patterns that are NOT TextInput props
$PlaceholderPatterns = @(
    "placeholder.*coming",
    "placeholder.*soon",
    "placeholder.*mock",
    "placeholder.*demo"
)

# Alert.alert specific patterns
$AlertPatterns = @(
    "Alert.alert.*soon",
    "Alert.alert.*coming", 
    "Alert.alert.*available.*later",
    "Alert.alert.*placeholder"
)

$ViolationsFound = $false

Write-Host "Checking source code for forbidden placeholder patterns..." -ForegroundColor White

# Check general patterns
foreach ($pattern in $ForbiddenPatterns) {
    Write-Host "  Checking: $pattern" -ForegroundColor Gray
    
    $matches = Select-String -Path "src\**\*.ts*" -Pattern $pattern -Quiet 2>$null
    if ($matches) {
        Write-Host "❌ VIOLATION: Found '$pattern' in source code" -ForegroundColor Red
        $ViolationsFound = $true
        
        # Show specific files with violations
        $files = Select-String -Path "src\**\*.ts*" -Pattern $pattern | Select-Object -ExpandProperty Filename -Unique
        foreach ($file in $files) {
        Write-Host "   File: $file" -ForegroundColor Yellow
        }
    }
}

# Check Alert.alert patterns
foreach ($pattern in $AlertPatterns) {
    Write-Host "  Checking Alert pattern: $pattern" -ForegroundColor Gray
    
    $matches = Select-String -Path "src\**\*.ts*" -Pattern $pattern -Quiet 2>$null
    if ($matches) {
        Write-Host "❌ VIOLATION: Found '$pattern' in Alert messages" -ForegroundColor Red
        $ViolationsFound = $true
        
        # Show specific files with violations
        $files = Select-String -Path "src\**\*.ts*" -Pattern $pattern | Select-Object -ExpandProperty Filename -Unique
        foreach ($file in $files) {
        Write-Host "   File: $file" -ForegroundColor Yellow
        }
    }
}

# Check non-TextInput placeholder patterns
foreach ($pattern in $PlaceholderPatterns) {
    Write-Host "  Checking placeholder pattern: $pattern" -ForegroundColor Gray
    
    $matches = Select-String -Path "src\**\*.ts*" -Pattern $pattern -Quiet 2>$null
    if ($matches) {
        Write-Host "❌ VIOLATION: Found '$pattern' in source code" -ForegroundColor Red
        $ViolationsFound = $true
        
        # Show specific files with violations
        $files = Select-String -Path "src\**\*.ts*" -Pattern $pattern | Select-Object -ExpandProperty Filename -Unique
        foreach ($file in $files) {
        Write-Host "   File: $file" -ForegroundColor Yellow
        }
    }
}

# Check for disabled buttons without implementation
Write-Host "  Checking for disabled buttons..." -ForegroundColor Gray
$disabledButtons = Select-String -Path "src\**\*.ts*" -Pattern "disabled.*true" | Where-Object { $_.Line -notmatch "isLoading" -and $_.Line -notmatch "!.*valid" }
if ($disabledButtons) {
    Write-Host "WARNING: Found disabled buttons - ensure they have proper implementation" -ForegroundColor Yellow
    foreach ($match in $disabledButtons) {
        Write-Host "   File: $($match.Filename):$($match.LineNumber)" -ForegroundColor Yellow
    }
}

# Check for empty catch blocks
Write-Host "  Checking for empty catch blocks..." -ForegroundColor Gray
$emptyCatch = Select-String -Path "src\**\*.ts*" -Pattern "catch.*\{\s*\}"
if ($emptyCatch) {
    Write-Host "WARNING: Found empty catch blocks - add proper error handling" -ForegroundColor Yellow
    foreach ($match in $emptyCatch) {
        Write-Host "   File: $($match.Filename):$($match.LineNumber)" -ForegroundColor Yellow
    }
}

# Final verdict
if ($ViolationsFound) {
    Write-Host ""
    Write-Host "COMMIT BLOCKED: Placeholder functionality detected!" -ForegroundColor Red -BackgroundColor Black
    Write-Host ""
    Write-Host "RULES VIOLATED:" -ForegroundColor Red
    Write-Host "  • NO 'coming soon' or similar placeholder messages" -ForegroundColor White
    Write-Host "  • NO disabled functionality without full implementation" -ForegroundColor White
    Write-Host "  • ALL features must work 100% before commit" -ForegroundColor White
    Write-Host ""
    Write-Host "ACTION REQUIRED:" -ForegroundColor Red
    Write-Host "  1. FIX all placeholder functionality immediately" -ForegroundColor White
    Write-Host "  2. IMPLEMENT proper backend integration" -ForegroundColor White
    Write-Host "  3. TEST all functionality end-to-end" -ForegroundColor White
    Write-Host "  4. TRY commit again" -ForegroundColor White
    Write-Host ""
    Write-Host "REMEMBER: IF IT IS IN THE APP, IT MUST WORK 100%" -ForegroundColor Red -BackgroundColor Black
    Write-Host ""
    exit 1
} else {
    Write-Host ""
    Write-Host "VALIDATION PASSED: No placeholder functionality detected" -ForegroundColor Green
    Write-Host "Success: All features appear to be fully implemented" -ForegroundColor Green
    Write-Host ""
    exit 0
}