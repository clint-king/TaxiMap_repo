# TeksiMap Docker Deployment Guide

This guide explains how to deploy the TeksiMap backend using Docker on AWS EC2.

## 🏗️ Architecture Overview

```
Internet → EC2 Instance → Nginx (Port 80/443) → Backend API (Port 3000)
                                    ↓
                              Redis (Port 6379)
                                    ↓
                              MySQL Database (External/Internal)
```

## 📋 Prerequisites

- AWS EC2 instance (Ubuntu 20.04+ recommended)
- Domain name pointing to your EC2 instance
- Docker and Docker Compose installed
- Security groups configured for HTTP/HTTPS traffic

## 🚀 Quick Start

### 1. Install Docker on EC2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes to take effect
exit
# SSH back into your instance
```

### 2. Clone and Setup Project

```bash
# Clone your repository
git clone <your-repo-url>
cd Map_Practise

# Make deployment script executable
chmod +x deploy-aws.sh

# Copy environment template
cp env.production.template .env.production
```

### 3. Configure Environment Variables

Edit `.env.production` with your actual values:

```bash
nano .env.production
```

Required variables:
- `MYSQL_HOST`: Your database host (RDS endpoint or external)
- `MYSQL_DATABASE`: Database name
- `MYSQL_USER`: Database username
- `MYSQL_PASSWORD`: Database password
- `JWT_SECRET`: Strong secret for JWT tokens
- `EMAIL_*`: Email configuration

### 4. Deploy

```bash
# Run deployment script
./deploy-aws.sh

# Or with local database for testing
./deploy-aws.sh --with-local-db
```

## 🔧 Configuration Options

### Database Options

#### Option 1: External Database (Recommended for Production)
- Use AWS RDS, external MySQL server, or managed database
- Set `MYSQL_HOST` to your external database endpoint
- Ensure security groups allow connection from EC2

#### Option 2: Local Database Container
- Use the `--with-local-db` flag when deploying
- Database runs on port 3307 to avoid conflicts
- Good for testing and development

### SSL Configuration

#### Option 1: Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo chown $USER:$USER nginx/ssl/*
```

#### Option 2: Custom SSL Certificates
- Place your SSL certificates in `nginx/ssl/`
- Name them `cert.pem` and `key.pem`

## 📁 File Structure

```
Map_Practise/
├── backend/
│   ├── Dockerfile              # Backend container definition
│   ├── .dockerignore           # Files to exclude from Docker build
│   └── server.js               # Your Express server
├── nginx/
│   └── nginx.aws.conf          # Nginx configuration for AWS
├── docker-compose.yml          # Local development
├── docker-compose.prod.yml     # Production deployment
├── docker-compose.aws.yml      # AWS EC2 specific
├── deploy-aws.sh               # Deployment script
├── env.docker.template         # Docker environment template
├── env.production.template     # Production environment template
└── DOCKER_DEPLOYMENT.md        # This file
```

## 🐳 Docker Compose Files

### `docker-compose.yml` (Local Development)
- Includes MySQL and Redis containers
- Volume mounts for live code changes
- Development environment variables

### `docker-compose.prod.yml` (Production)
- Production-optimized settings
- Resource limits and health checks
- Nginx reverse proxy

### `docker-compose.aws.yml` (AWS EC2)
- AWS-specific optimizations
- External database support
- Comprehensive logging and monitoring
- Optional local database for testing

## 🔍 Monitoring and Logs

### View Logs
```bash
# All services
docker-compose -f docker-compose.aws.yml logs

# Specific service
docker-compose -f docker-compose.aws.yml logs backend

# Follow logs in real-time
docker-compose -f docker-compose.aws.yml logs -f
```

### Health Checks
```bash
# Check service status
docker-compose -f docker-compose.aws.yml ps

# Health check endpoint
curl http://localhost/health
```

### Resource Usage
```bash
# Container resource usage
docker stats

# Disk usage
docker system df
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
sudo netstat -tulpn | grep :3000

# Stop conflicting services
sudo systemctl stop apache2  # if Apache is running
```

#### 2. Permission Denied
```bash
# Fix directory permissions
sudo chown -R $USER:$USER /var/log/teksimap
sudo chown -R $USER:$USER nginx
```

#### 3. Database Connection Issues
```bash
# Test database connectivity
docker exec -it teksimap_backend_aws sh
ping mysql
# or
telnet mysql 3306
```

#### 4. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Verify certificate chain
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt nginx/ssl/cert.pem
```

### Debug Mode
```bash
# Run with verbose output
docker-compose -f docker-compose.aws.yml up --build -d

# Check container logs immediately
docker-compose -f docker-compose.aws.yml logs -f
```

## 🔄 Updates and Maintenance

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.aws.yml down
docker-compose -f docker-compose.aws.yml up -d --build
```

### Update Dependencies
```bash
# Update npm packages
docker exec -it teksimap_backend_aws npm update

# Rebuild container
docker-compose -f docker-compose.aws.yml restart backend
```

### Backup and Restore
```bash
# Backup database
docker exec teksimap_mysql_local mysqldump -u root -p teksimap_db > backup.sql

# Restore database
docker exec -i teksimap_mysql_local mysql -u root -p teksimap_db < backup.sql
```

## 📊 Performance Optimization

### Resource Limits
- Backend: 1GB RAM, 1 CPU
- Redis: 256MB RAM, 0.5 CPU
- Nginx: 128MB RAM, 0.25 CPU

### Scaling
```bash
# Scale backend service
docker-compose -f docker-compose.aws.yml up -d --scale backend=3

# Use load balancer for multiple instances
```

## 🔒 Security Considerations

- Use strong passwords for database and JWT
- Keep environment variables secure
- Regularly update Docker images
- Monitor logs for suspicious activity
- Use HTTPS only in production
- Implement rate limiting (already configured in Nginx)

## 📞 Support

If you encounter issues:
1. Check the logs: `docker-compose -f docker-compose.aws.yml logs`
2. Verify environment variables are set correctly
3. Ensure all prerequisites are met
4. Check AWS security group configurations

## 🎯 Next Steps

After successful deployment:
1. Configure your domain DNS to point to EC2
2. Set up SSL certificates
3. Configure monitoring (CloudWatch, etc.)
4. Set up automated backups
5. Implement CI/CD pipeline
6. Set up logging aggregation
7. Configure alerts and notifications
