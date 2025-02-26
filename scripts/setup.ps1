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
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║  ███████╗███████╗ █████╗ ██████╗ ██████╗  █████╗  ██████╗  ██████╗ ███╗   ██╗  ║
║  ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔════╝ ██╔═══██╗████╗  ██║  ║
║  ███████╗█████╗  ███████║██║  ██║██████╔╝███████║██║  ███╗██║   ██║██╔██╗ ██║  ║
║  ╚════██║██╔══╝  ██╔══██║██║  ██║██╔══██╗██╔══██║██║   ██║██║   ██║██║╚██╗██║  ║
║  ███████║███████╗██║  ██║██████╔╝██║  ██║██║  ██║╚██████╔╝╚██████╔╝██║ ╚████║  ║
║  ╚══════╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝  ║
║                                                                                ║
║                     𝕃𝕃𝕄 𝕊𝔼ℝ𝕍𝔼ℝ                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
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

# Check if PostgreSQL is installed
Write-Host "🔍 " -NoNewline -ForegroundColor Blue
Show-TypingAnimation "Checking for PostgreSQL installation..." -Speed 5 -Color White
Start-Sleep -Milliseconds 300

try {
    $pgVersion = psql --version 2>&1
    Show-SpinnerAnimation "Detecting PostgreSQL version" -Seconds 1
    Write-Host "   └─ $pgVersion" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️ PostgreSQL not detected. You'll need to install PostgreSQL for database functionality." -ForegroundColor Yellow
    Write-Host "   └─ The application will use SQLite for development if PostgreSQL is not available." -ForegroundColor Yellow
    Write-Host "   └─ Install from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
}

# Check if RabbitMQ is installed
Write-Host "🔍 " -NoNewline -ForegroundColor Blue
Show-TypingAnimation "Checking for RabbitMQ installation..." -Speed 5 -Color White
Start-Sleep -Milliseconds 300

try {
    $rabbitVersion = rabbitmqctl status 2>&1
    if ($rabbitVersion -match "RabbitMQ") {
        Show-SpinnerAnimation "Detecting RabbitMQ" -Seconds 1
        Write-Host "   └─ RabbitMQ detected" -ForegroundColor Cyan
    } else {
        throw "RabbitMQ not found"
    }
} catch {
    Write-Host "⚠️ RabbitMQ not detected. You'll need to install RabbitMQ for queue functionality." -ForegroundColor Yellow
    Write-Host "   └─ Install with: choco install rabbitmq" -ForegroundColor Yellow
    Write-Host "   └─ Or download from: https://www.rabbitmq.com/download.html" -ForegroundColor Yellow
}

# Check if Ollama is installed
Write-Host "🔍 " -NoNewline -ForegroundColor Blue
Show-TypingAnimation "Checking for Ollama installation..." -Speed 5 -Color White
Start-Sleep -Milliseconds 300

try {
    $ollamaVersion = ollama --version 2>&1
    Show-SpinnerAnimation "Detecting Ollama version" -Seconds 1
    Write-Host "   └─ Ollama detected" -ForegroundColor Cyan
    
    # Check if Llama 3 model is installed
    Write-Host "🤖 " -NoNewline -ForegroundColor Blue
    Show-TypingAnimation "Checking for Llama 3 model..." -Speed 5 -Color White
    
    $modelList = ollama list 2>&1
    if ($modelList -match "llama3.3") {
        Write-Host "   └─ Llama 3.3 model found" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Llama 3.3 model not found. Installing..." -ForegroundColor Yellow
        Show-SpinnerAnimation "Downloading Llama 3.3 model (this may take a while)" -Seconds 5
        ollama pull llama3.3:70b
    }
} catch {
    Write-Host "⚠️ Ollama not detected. You'll need to install Ollama for LLM functionality." -ForegroundColor Yellow
    Write-Host "   └─ Download from: https://ollama.ai/download" -ForegroundColor Yellow
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

Show-ProgressBar "Installing backend dependencies from requirements.txt" -DurationMs 2000
pip install -r requirements.txt

# Create .env file for backend
Write-Host ""
Write-Host "🔧 " -NoNewline -ForegroundColor Yellow
Show-TypingAnimation "Creating environment configuration..." -Speed 5 -Color "White"

# Copy .env.example to .env if it doesn't exist
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Show-SpinnerAnimation "Created .env configuration file from example" -Seconds 1
    } else {
        $envContent = @"
# Database configuration
DATABASE_URL=postgresql://postgres:postgres@localhost/seadragon
# For SQLite (fallback)
# DATABASE_URL=sqlite:///./seadragon.db

# JWT configuration
JWT_SECRET_KEY=CHANGE_ME_IN_PRODUCTION
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Ollama configuration
OLLAMA_API_URL=http://localhost:11434

# RabbitMQ configuration
RABBITMQ_URL=amqp://guest:guest@localhost/

# IP whitelist for direct API access (comma-separated)
WHITELISTED_IPS=127.0.0.1,::1
"@
        $envContent | Out-File -FilePath ".env" -Encoding utf8
        Show-SpinnerAnimation "Created .env configuration file" -Seconds 1
    }
}

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

# Create .env file for frontend
$frontendEnvContent = @"
VITE_API_URL=http://localhost:8000
VITE_WEBSOCKET_URL=ws://localhost:8000/ws
"@

$frontendEnvContent | Out-File -FilePath ".env" -Encoding utf8
Show-SpinnerAnimation "Created frontend .env configuration file" -Seconds 1

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
║               🌟  Setup complete! Ready to go!  🌟           ║
║                                                               ║
║  To start the development server:                             ║
║                                                               ║
║  1. Ollama:                                                   ║
║     - Ensure Ollama is running                                ║
║     - Model llama3.3:70b should be downloaded                   ║
║                                                               ║
║  2. RabbitMQ:                                                 ║
║     - Ensure RabbitMQ service is running                      ║
║     - Default credentials: guest/guest                        ║
║                                                               ║
║  3. Database:                                                 ║
║     - Create a PostgreSQL database named 'seadragon'          ║
║     - Or use SQLite by updating the DATABASE_URL in .env      ║
║                                                               ║
║  4. Backend:                                                  ║
║     cd backend                                                ║
║     .\venv\Scripts\activate                                   ║
║     uvicorn app.main:app --reload                             ║
║                                                               ║
║  5. Frontend:                                                 ║
║     cd frontend                                               ║
║     pnpm dev                                                  ║
║                                                               ║
║  6. API Documentation:                                        ║
║     - Visit http://localhost:8000/docs when backend is running║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"@

$completion -split "`n" | ForEach-Object {
    Write-Host $_ -ForegroundColor Cyan
    Start-Sleep -Milliseconds 20
}

Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Magenta