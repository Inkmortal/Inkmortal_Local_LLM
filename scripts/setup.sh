#!/bin/bash

# Seadragon LLM Server Setup Script (macOS/Linux)
# ===============================================

# ANSI color codes for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ASCII art logo
echo -e "${MAGENTA}"
cat << "EOF"
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
EOF
echo -e "${RESET}"

echo -e "${CYAN}Initializing Seadragon LLM Server project setup...${RESET}"
sleep 0.5
echo -e "${YELLOW}Your personal AI tutor powered by Llama 3${RESET}"
sleep 0.5
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to display a spinner while a command is running
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Function to display progress bar
progress_bar() {
    local title=$1
    local duration=$2
    local width=30
    
    echo -e "${MAGENTA}[$title] ${RESET}"
    for ((i=0; i<=$width; i++)); do
        local percent=$((i*100/width))
        local progress=$(printf "%${i}s" | tr ' ' '█')
        local remaining=$(printf "%$((width-i))s" | tr ' ' ' ')
        echo -ne "\r[$title] |${progress}${remaining}| ${percent}%"
        sleep $(echo "scale=3; $duration/$width" | bc)
    done
    echo -e "\r[$title] |$(printf "%${width}s" | tr ' ' '█')| 100% ${GREEN}✓${RESET}"
}

# Check for required tools
echo -e "${BLUE}🔍 ${RESET}Checking for required tools..."

# Check Python
if command_exists python3; then
    PYTHON_CMD="python3"
elif command_exists python; then
    PYTHON_CMD="python"
else
    echo -e "${RED}❌ Python not found. Please install Python 3.9+ and try again.${RESET}"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
echo -e "${GREEN}✓ ${RESET}Found $PYTHON_VERSION"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ ${RESET}Found Node.js $NODE_VERSION"
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+ and try again.${RESET}"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ ${RESET}Found npm $NPM_VERSION"
else
    echo -e "${RED}❌ npm not found. Please install npm and try again.${RESET}"
    exit 1
fi

# Check if we're on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${BLUE}🍎 ${RESET}macOS detected"
    
    # Check for Homebrew
    if command_exists brew; then
        BREW_VERSION=$(brew --version | head -n 1)
        echo -e "${GREEN}✓ ${RESET}Found $BREW_VERSION"
    else
        echo -e "${YELLOW}⚠️ ${RESET}Homebrew not found. It's recommended for managing dependencies on macOS."
        echo -e "   Install from https://brew.sh if desired."
    fi
    
    # Check for pyenv
    if command_exists pyenv; then
        PYENV_VERSION=$(pyenv --version)
        echo -e "${GREEN}✓ ${RESET}Found $PYENV_VERSION"
    else
        echo -e "${YELLOW}⚠️ ${RESET}pyenv not found. It's recommended for managing Python versions."
        echo -e "   Install with: brew install pyenv"
    fi
fi

echo ""
echo -e "${CYAN}🚀 ${RESET}Setting up project structure..."

# Create directory structure if it doesn't exist
mkdir -p backend/app/{api,auth,queue} frontend/{public,src/{components,pages}} nginx scripts

# Create empty __init__.py files for Python packages
touch backend/app/__init__.py backend/app/api/__init__.py backend/app/auth/__init__.py backend/app/queue/__init__.py

echo -e "${GREEN}✓ ${RESET}Project structure created"

# Setup Backend
echo ""
echo -e "${CYAN}🐍 ${RESET}Setting up backend environment..."

cd backend

# Create virtual environment
echo -e "${BLUE}Creating Python virtual environment...${RESET}"
$PYTHON_CMD -m venv venv
echo -e "${GREEN}✓ ${RESET}Virtual environment created"

# Activate virtual environment
echo -e "${BLUE}Activating virtual environment...${RESET}"
source venv/bin/activate

# Install backend dependencies
echo -e "${BLUE}Installing Python dependencies...${RESET}"
progress_bar "Installing FastAPI and dependencies" 2
pip install fastapi uvicorn sqlalchemy psycopg2-binary httpx python-jose[cryptography] python-multipart

# Return to project root
cd ..

# Setup Frontend
echo ""
echo -e "${CYAN}🎨 ${RESET}Setting up frontend environment..."

cd frontend

# Install frontend dependencies
echo -e "${BLUE}Installing Node.js dependencies...${RESET}"
progress_bar "Installing React and dependencies" 3
npm install

# Return to project root
cd ..

# Setup completion
echo ""
echo -e "${GREEN}✨ ${RESET}Setup completed successfully!"

cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║               🌟  Setup complete! Ready to go!  🌟            ║
║                                                               ║
║  To start the development server:                             ║
║                                                               ║
║  1. Backend:                                                  ║
║     cd backend                                                ║
║     source venv/bin/activate                                  ║
║     uvicorn app.main:app --reload                             ║
║                                                               ║
║  2. Frontend:                                                 ║
║     cd frontend                                               ║
║     npm run dev                                               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF

echo ""
echo -e "${MAGENTA}Happy coding! 🚀${RESET}"