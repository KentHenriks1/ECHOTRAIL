# PowerShell script to create placeholder icons
# This creates simple colored rectangles as placeholder icons

# Create icon.png (1024x1024)
$iconScript = @'
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(1024, 1024)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(37, 99, 235))
$graphics.FillRectangle($brush, 0, 0, 1024, 1024)

# Add text "E"
$font = New-Object System.Drawing.Font("Arial", 400, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$graphics.DrawString("E", $font, $textBrush, 300, 200)

$bitmap.Save("assets/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
'@

# Create adaptive-icon.png (1024x1024)
$adaptiveIconScript = @'
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(1024, 1024)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(37, 99, 235))
$graphics.FillRectangle($brush, 0, 0, 1024, 1024)

# Add text "ET"
$font = New-Object System.Drawing.Font("Arial", 200, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$graphics.DrawString("ET", $font, $textBrush, 300, 400)

$bitmap.Save("assets/adaptive-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
'@

# Create splash.png (1284x2778)
$splashScript = @'
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(1284, 2778)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(37, 99, 235))
$graphics.FillRectangle($brush, 0, 0, 1284, 2778)

# Add text "EchoTrail"
$font = New-Object System.Drawing.Font("Arial", 100, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$graphics.DrawString("EchoTrail", $font, $textBrush, 200, 1300)

$bitmap.Save("assets/splash.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
'@

# Create favicon.png (48x48)
$faviconScript = @'
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(48, 48)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(37, 99, 235))
$graphics.FillRectangle($brush, 0, 0, 48, 48)

# Add text "E"
$font = New-Object System.Drawing.Font("Arial", 20, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$graphics.DrawString("E", $font, $textBrush, 14, 10)

$bitmap.Save("assets/favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
'@

try {
    Write-Host "Creating placeholder icons..." -ForegroundColor Green
    
    # Execute scripts
    Invoke-Expression $iconScript
    Write-Host "✓ Created icon.png" -ForegroundColor Green
    
    Invoke-Expression $adaptiveIconScript  
    Write-Host "✓ Created adaptive-icon.png" -ForegroundColor Green
    
    Invoke-Expression $splashScript
    Write-Host "✓ Created splash.png" -ForegroundColor Green
    
    Invoke-Expression $faviconScript
    Write-Host "✓ Created favicon.png" -ForegroundColor Green
    
    Write-Host "`nAll placeholder icons created successfully!" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error creating icons: $($_.Exception.Message)" -ForegroundColor Red
}
