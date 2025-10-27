#!/bin/bash

# TeksiMap AWS EC2 Deployment Script
# This script deploys your TeksiMap backend to AWS EC2 using Docker

echo "🚀 Deploying TeksiMap to AWS EC2..."

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

# Check if environment file exists
if [ ! -f .env.production ]; then
    print_error ".env.production file not found!"
    print_status "Please copy env.production.template to .env.production and configure it:"
    echo "  cp env.production.template .env.production"
    echo "  nano .env.production"
    exit 1
fi

# Load environment variables
print_status "Loading environment variables..."
source .env.production

# Validate required environment variables
print_status "Validating environment variables..."

required_vars=(
    "MYSQL_HOST"
    "MYSQL_DATABASE"
    "MYSQL_USER"
    "MYSQL_PASSWORD"
    "JWT_SECRET"
    "EMAIL_HOST"
    "EMAIL_PORT"
    "EMAIL_USER"
    "EMAIL_PASSWORD"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    print_status "Please update your .env.production file with these values."
    exit 1
fi

print_success "Environment variables validated!"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p nginx/ssl
mkdir -p backend/uploads
mkdir -p /var/log/teksimap/{backend,redis,nginx}

# Generate SSL certificates if they don't exist
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    print_status "Generating SSL certificates for testing..."
    ./generate-ssl.sh
    print_warning "Self-signed certificates generated for testing only!"
    print_status "For production, use Let's Encrypt or purchase valid SSL certificates."
fi

# Stop and remove existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.aws.yml down --remove-orphans

# Remove old images
print_status "Removing old images..."
docker image prune -f

# Build and start services
print_status "Building and starting services..."
if docker-compose -f docker-compose.aws.yml up -d --build; then
    print_success "Services started successfully!"
else
    print_error "Failed to start services!"
    print_status "Showing logs for debugging:"
    docker-compose -f docker-compose.aws.yml logs
    exit 1
fi

# Wait for services to start
print_status "Waiting for services to start..."
sleep 30

# Check service health
print_status "Checking service health..."
if docker-compose -f docker-compose.aws.yml ps | grep -q "unhealthy"; then
    print_error "Some services are unhealthy:"
    docker-compose -f docker-compose.aws.yml ps
    print_status "Showing logs for debugging:"
    docker-compose -f docker-compose.aws.yml logs
    exit 1
fi

print_success "All services are healthy!"

# Test the health endpoint
print_status "Testing health endpoint..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    print_success "Health endpoint is working!"
else
    print_warning "Health endpoint test failed (this might be normal during startup)"
fi

# Show running services
print_status "Running services:"
docker-compose -f docker-compose.aws.yml ps

# Show service URLs
print_status "Service URLs:"
echo "Backend API: http://localhost:3000"
echo "Nginx (HTTP): http://localhost"
echo "Nginx (HTTPS): https://localhost"
echo "Redis: localhost:6379"

# Show database connection info
print_status "Database Configuration:"
echo "Host: $MYSQL_HOST"
echo "Database: $MYSQL_DATABASE"
echo "User: $MYSQL_USER"
echo "Port: $MYSQL_PORT"

print_success "🎉 Deployment completed successfully!"
echo ""
print_status "Next steps:"
echo "1. Configure your domain DNS to point to this EC2 instance"
echo "2. Set up SSL certificates (Let's Encrypt recommended for production)"
echo "3. Test your API endpoints"
echo "4. Monitor logs: docker-compose -f docker-compose.aws.yml logs -f"
echo ""
print_status "Your TeksiMap backend is now running on AWS EC2! 🚀"
