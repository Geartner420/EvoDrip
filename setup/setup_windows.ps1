# setup_windows.ps1 – Install newdrip.js as a Windows service using sc.exe

# Variables
$WORKDIR = "C:\newdrip"

# Create working directory
New-Item -ItemType Directory -Path $WORKDIR -Force | Out-Null
Copy-Item -Path .\newdrip.js -Destination $WORKDIR -Force
Set-Location $WORKDIR

# Install dependencies
npm install

# Ensure .env exists
if (-Not (Test-Path .\env)) {
    Write-Error ".env file not found. Please create .env in $WORKDIR with your configuration."
    exit 1
}

# Locate node executable
$nodePath = (Get-Command node).Source

# Create service
$serviceName = "NewDrip"
sc.exe create $serviceName binPath= "`"$nodePath`" `"$WORKDIR\newdrip.js`"" start= auto
sc.exe description $serviceName "NewDrip Plant Watering Service"
sc.exe start $serviceName
Write-Host "Service '$serviceName' installed and started. Use 'Get-Service $serviceName' to verify."
