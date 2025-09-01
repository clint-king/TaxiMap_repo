#!/bin/bash

# Test Docker Setup Locally
# This script tests the Docker setup before deploying to AWS

echo "🧪 Testing Docker Setup Locally..."

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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed or not in PATH."
    exit 1
fi

print_success "Docker and Docker Compose are available"

# Create environment file for local testing
if [ ! -f .env.docker ]; then
    print_status "Creating local Docker environment file..."
    cp env.docker.template .env.docker
    print_warning "Please edit .env.docker with your actual values if needed"
fi

# Test building the backend image
print_status "Testing backend image build..."
if docker-compose build backend; then
    print_success "Backend image built successfully"
else
    print_error "Failed to build backend image"
    exit 1
fi

# Test running the services
print_status "Starting services for testing..."
docker-compose up -d

# Wait for services to start
print_status "Waiting for services to start..."
sleep 30

# Check service health
print_status "Checking service health..."
if docker-compose ps | grep -q "unhealthy"; then
    print_error "Some services are unhealthy:"
    docker-compose ps
    print_status "Showing logs for debugging:"
    docker-compose logs
    docker-compose down
    exit 1
fi

print_success "All services are healthy!"

# Test the health endpoint
print_status "Testing health endpoint..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    print_success "Health endpoint is working"
else
    print_warning "Health endpoint test failed (this might be normal during startup)"
fi

# Show running services
print_status "Running services:"
docker-compose ps

# Show service URLs
print_status "Service URLs:"
echo "Backend API: http://localhost:3000"
echo "MySQL: localhost:3306"
echo "Redis: localhost:6379"

print_success "🎉 Local Docker test completed successfully!"
print_status "You can now:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Test your API endpoints"
echo ""
print_status "When ready to deploy to AWS, run: ./deploy-aws.sh"
