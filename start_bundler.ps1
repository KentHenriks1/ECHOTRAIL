Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Start Metro/Expo bundler in a new minimized PowerShell window
$scriptBlock = {
  try {
    Set-Location 'C:\et\apps\mobile'
    $env:NODE_ENV = 'development'
    pnpm start
  } catch {
    Write-Error $_
  }
}

# Launch a new PowerShell window running the bundler
Start-Process -FilePath 'pwsh' -ArgumentList @('-NoProfile','-NoExit','-Command',$scriptBlock) -WindowStyle Minimized | Out-Null

Write-Host 'Metro bundler starting in a separate window.'
