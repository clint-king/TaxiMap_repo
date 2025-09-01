#!/bin/bash

# TeksiMap Quick Start Script
# This script sets up everything needed for Docker deployment

echo "🚀 TeksiMap Quick Start Setup..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on Windows
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    print_warning "Windows detected. Some commands may need to be run in WSL or Git Bash."
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Docker
if command_exists docker; then
    print_success "Docker is installed"
    docker --version
else
    print_error "Docker is not installed. Please install Docker first."
    print_status "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if command_exists docker-compose; then
    print_success "Docker Compose is installed"
    docker-compose --version
else
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    print_status "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_success "All prerequisites are met!"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p nginx/ssl
mkdir -p backend/uploads

# Make scripts executable
print_status "Making scripts executable..."
chmod +x deploy-aws.sh generate-ssl.sh test-docker-local.sh quick-start.sh

# Create environment files if they don't exist
if [ ! -f .env.docker ]; then
    print_status "Creating Docker environment file..."
    cp env.docker.template .env.docker
    print_warning "Please edit .env.docker with your actual values if needed"
fi

if [ ! -f .env.production ]; then
    print_status "Creating production environment file..."
    cp env.production.template .env.production
    print_warning "Please edit .env.production with your actual values before deploying to AWS"
fi

# Generate SSL certificates for testing
print_status "Generating SSL certificates for testing..."
./generate-ssl.sh

# Test Docker build
print_status "Testing Docker build..."
if docker-compose build backend; then
    print_success "Docker build successful!"
else
    print_error "Docker build failed. Please check the errors above."
    exit 1
fi

print_success "🎉 Quick start setup completed successfully!"
echo ""
print_status "Next steps:"
echo ""
echo "1. 🧪 Test locally:"
echo "   ./test-docker-local.sh"
echo ""
echo "2. 🚀 Deploy to AWS:"
echo "   ./deploy-aws.sh"
echo ""
echo "3. 📚 Read the documentation:"
echo "   - DOCKER_DEPLOYMENT.md - Complete Docker guide"
echo "   - AWS_EC2_SETUP.md - AWS EC2 setup guide"
echo ""
echo "4. ⚙️  Configure environment variables:"
echo "   - Edit .env.docker for local development"
echo "   - Edit .env.production for AWS deployment"
echo ""
print_status "Happy deploying! 🚀"
