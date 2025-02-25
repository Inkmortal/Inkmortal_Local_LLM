# Seadragon LLM Server Setup Script (PowerShell)
function Show-TypingAnimation {
    param ([string]$Text, [int]$Speed = 30, [string]$Color = "Cyan")
    
    foreach ($char in $Text.ToCharArray()) {
        Write-Host $char -NoNewline -ForegroundColor $Color
        Start-Sleep -Milliseconds $Speed
    }
    Write-Host ""
}

function Show-SpinnerAnimation {
    param ([string]$Text, [int]$Seconds = 2)
    
    $spinner = @('⣾','⣽','⣻','⢿','⡿','⣟','⣯','⣷')
    $startTime = Get-Date
    $endTime = $startTime.AddSeconds($Seconds)
    
    while ((Get-Date) -lt $endTime) {
        foreach ($spin in $spinner) {
            Write-Host "`r$spin $Text" -NoNewline -ForegroundColor Yellow
            Start-Sleep -Milliseconds 80
        }
    }
    Write-Host "`r✓ $Text               " -ForegroundColor Green
}

function Show-ProgressBar {
    param ([string]$Task, [int]$DurationMs = 1500)
    
    Write-Host "[$Task] " -NoNewline -ForegroundColor Magenta
    $width = 30
    for ($i = 0; $i -le $width; $i++) {
        $percent = [math]::Floor(($i / $width) * 100)
        $progress = '█' * $i
        $remaining = ' ' * ($width - $i)
        Write-Host "`r[$Task] |$progress$remaining| $percent%" -NoNewline
        Start-Sleep -Milliseconds ([math]::Floor($DurationMs / $width))
    }
    Write-Host "`r[$Task] |$('█' * $width)| 100% " -ForegroundColor Green
}

# Clear screen and show intro
Clear-Host
$logo = @"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  ███████╗███████╗ █████╗ ██████╗ ██████╗  █████╗  ██████╗  ██████╗ ███╗   ██╗  ║
║  ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔════╝ ██╔═══██╗████╗  ██║  ║
║  ███████╗█████╗  ███████║██║  ██║██████╔╝███████║██║  ███╗██║   ██║██╔██╗ ██║  ║
║  ╚════██║██╔══╝  ██╔══██║██║  ██║██╔══██╗██╔══██║██║   ██║██║   ██║██║╚██╗██║  ║
║  ███████║███████╗██║  ██║██████╔╝██║  ██║██║  ██║╚██████╔╝╚██████╔╝██║ ╚████║  ║
║  ╚══════╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝  ║
║                                                               ║
║                     𝕃𝕃𝕄 𝕊𝔼ℝ𝕍𝔼ℝ                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"@

$logo -split "`n" | ForEach-Object {
    Write-Host $_ -ForegroundColor Magenta
    Start-Sleep -Milliseconds 20
}

Start-Sleep -Milliseconds 500
Show-TypingAnimation "Initializing Seadragon LLM Server project setup..." -Speed 10
Start-Sleep -Milliseconds 300
Show-TypingAnimation "Your personal AI tutor powered by Llama 3" -Speed 10 -Color "Yellow"
Start-Sleep -Milliseconds 500
Write-Host ""

# Check if Python is installed
Write-Host "🔍 " -NoNewline -ForegroundColor Blue
Show-TypingAnimation "Checking for Python installation..." -Speed 5 -Color White
Start-Sleep -Milliseconds 300

try {
    $pythonVersion = python --version 2>&1
    Show-SpinnerAnimation "Detecting Python version" -Seconds 1
    Write-Host "   └─ $pythonVersion" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Python not found. Please install Python 3.9+ and try again." -ForegroundColor Red
    exit
}

# Check if Node.js is installed
Write-Host "🔍 " -NoNewline -ForegroundColor Blue
Show-TypingAnimation "Checking for Node.js installation..." -Speed 5 -Color White
Start-Sleep -Milliseconds 300

try {
    $nodeVersion = node --version
    Show-SpinnerAnimation "Detecting Node.js version" -Seconds 1
    Write-Host "   └─ Node.js $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ and try again." -ForegroundColor Red
    exit
}

# Check if pnpm is installed
Write-Host "🔍 " -NoNewline -ForegroundColor Blue
Show-TypingAnimation "Checking for pnpm installation..." -Speed 5 -Color White
Start-Sleep -Milliseconds 300

try {
    $pnpmVersion = pnpm --version
    Show-SpinnerAnimation "Detecting pnpm version" -Seconds 1
    Write-Host "   └─ pnpm $pnpmVersion" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️ pnpm not found. Attempting to install..." -ForegroundColor Yellow
    
    Show-SpinnerAnimation "Installing pnpm globally" -Seconds 3
    npm install -g pnpm
    
    # Verify installation
    try {
        $pnpmVersion = pnpm --version
        Write-Host "   └─ Successfully installed pnpm $pnpmVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install pnpm. Please install it manually and try again." -ForegroundColor Red
        exit
    }
}

# Setup Backend
Write-Host ""
Write-Host "🚀 " -NoNewline -ForegroundColor Yellow
Show-TypingAnimation "Setting up backend environment..." -Speed 5 -Color Cyan
Write-Host ""

# Create and activate virtual environment
Set-Location backend
Show-ProgressBar "Creating Python virtual environment" -DurationMs 1200

python -m venv venv
Show-SpinnerAnimation "Activating virtual environment" -Seconds 1

# The PowerShell equivalent of activating a venv
.\venv\Scripts\Activate.ps1

# Install backend dependencies
Write-Host ""
Write-Host "📦 " -NoNewline -ForegroundColor Yellow
Show-TypingAnimation "Installing Python dependencies..." -Speed 5 -Color "White"
Start-Sleep -Milliseconds 300

Show-ProgressBar "Installing FastAPI and dependencies" -DurationMs 2000
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-jose[cryptography] httpx python-multipart

# Return to project root
Set-Location ..

# Setup Frontend
Write-Host ""
Write-Host "🎨 " -NoNewline -ForegroundColor Yellow
Show-TypingAnimation "Setting up frontend environment..." -Speed 5 -Color Cyan
Write-Host ""

Set-Location frontend
Show-ProgressBar "Installing Node.js dependencies" -DurationMs 3000

# Install frontend dependencies 
pnpm install

# Return to project root
Set-Location ..

# Setup completion
Write-Host ""
Write-Host "✨ " -NoNewline
Show-TypingAnimation "Setup completed successfully!" -Speed 5 -Color Green
Start-Sleep -Milliseconds 300

$completion = @"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║               🌟  Setup complete! Ready to go!  🌟            ║
║                                                               ║
║  To start the development server:                             ║
║                                                               ║
║  1. Backend:                                                  ║
║     cd backend                                                ║
║     .\venv\Scripts\activate                                   ║
║     uvicorn app.main:app --reload                             ║
║                                                               ║
║  2. Frontend:                                                 ║
║     cd frontend                                               ║
║     pnpm dev                                                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"@

$completion -split "`n" | ForEach-Object {
    Write-Host $_ -ForegroundColor Cyan
    Start-Sleep -Milliseconds 20
}

Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Magenta