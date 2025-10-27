# AWS EC2 Setup Guide for TeksiMap

This guide walks you through setting up an AWS EC2 instance for deploying your TeksiMap backend using Docker.

## 🚀 Step 1: Launch EC2 Instance

### 1.1 Choose Instance Type
- **Recommended**: `t3.medium` or `t3.large` for production
- **Minimum**: `t3.micro` for testing (free tier eligible)
- **CPU**: 2 vCPUs minimum
- **RAM**: 4GB minimum for production

### 1.2 Configure Instance
- **AMI**: Ubuntu Server 20.04 LTS (HVM) - SSD Volume Type
- **Instance Type**: t3.medium
- **Storage**: 20GB GP2 SSD (minimum)

### 1.3 Security Groups
Create a security group with these rules:

| Type | Protocol | Port Range | Source |
|------|----------|------------|---------|
| SSH | TCP | 22 | Your IP / 0.0.0.0/0 |
| HTTP | TCP | 80 | 0.0.0.0/0 |
| HTTPS | TCP | 443 | 0.0.0.0/0 |
| Custom TCP | TCP | 3000 | 0.0.0.0/0 |
| Custom TCP | TCP | 3306 | 0.0.0.0/0 (if using local MySQL) |

### 1.4 Key Pair
- Create a new key pair or use existing
- Download the `.pem` file
- Keep it secure - you'll need it to SSH into the instance

## 🔑 Step 2: Connect to EC2

### 2.1 SSH Connection
```bash
# On Windows (PowerShell)
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip

# On Mac/Linux
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### 2.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip
```

## 🐳 Step 3: Install Docker

### 3.1 Install Docker
```bash
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

### 3.2 Verify Installation
```bash
docker --version
docker-compose --version
docker run hello-world
```

## 📁 Step 4: Deploy Your Application

### 4.1 Clone Repository
```bash
# Clone your repository
git clone <your-repo-url>
cd Map_Practise

# Make scripts executable
chmod +x deploy-aws.sh generate-ssl.sh test-docker-local.sh
```

### 4.2 Configure Environment
```bash
# Copy production environment template
cp env.production.template .env.production

# Edit with your actual values
nano .env.production
```

**Required Environment Variables:**
```bash
NODE_ENV=production
PORT=3000

# Database (use your external database or RDS)
MYSQL_HOST=your-database-host
MYSQL_DATABASE=your-database-name
MYSQL_USER=your-database-user
MYSQL_PASSWORD=your-database-password

# JWT Secret (generate a strong one)
JWT_SECRET=your-very-strong-jwt-secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@teksimap.co.za
```

### 4.3 Generate SSL Certificates (for testing)
```bash
# Generate self-signed certificates for testing
./generate-ssl.sh

# For production, use Let's Encrypt (see SSL section below)
```

### 4.4 Deploy
```bash
# Deploy to AWS
./deploy-aws.sh

# Or with local database for testing
./deploy-aws.sh --with-local-db
```

## 🔐 Step 5: SSL Configuration

### 5.1 Let's Encrypt (Recommended for Production)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo chown $USER:$USER nginx/ssl/*
```

### 5.2 Custom SSL Certificates
- Place your SSL certificates in `nginx/ssl/`
- Name them `cert.pem` and `key.pem`
- Ensure proper permissions: `chmod 600 nginx/ssl/key.pem`

## 🌐 Step 6: Domain Configuration

### 6.1 DNS Settings
Point your domain to your EC2 instance:
- **A Record**: `@` → Your EC2 public IP
- **A Record**: `api` → Your EC2 public IP (if using subdomain)

### 6.2 Update Frontend Configuration
Update your frontend to use the new API endpoint:
```javascript
// In your frontend configuration
const API_BASE_URL = 'https://yourdomain.com';
// or
const API_BASE_URL = 'https://api.yourdomain.com';
```

## 📊 Step 7: Monitoring and Maintenance

### 7.1 View Logs
```bash
# All services
docker-compose -f docker-compose.aws.yml logs

# Specific service
docker-compose -f docker-compose.aws.yml logs backend

# Follow logs in real-time
docker-compose -f docker-compose.aws.yml logs -f
```

### 7.2 Health Checks
```bash
# Check service status
docker-compose -f docker-compose.aws.yml ps

# Test health endpoint
curl http://localhost/health
```

### 7.3 Resource Monitoring
```bash
# Container resource usage
docker stats

# Disk usage
docker system df
```

## 🔄 Step 8: Updates and Scaling

### 8.1 Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.aws.yml down
docker-compose -f docker-compose.aws.yml up -d --build
```

### 8.2 Scale Services
```bash
# Scale backend service
docker-compose -f docker-compose.aws.yml up -d --scale backend=3
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
ping your-database-host
telnet your-database-host 3306
```

#### 4. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Verify certificate chain
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt nginx/ssl/cert.pem
```

## 💰 Cost Optimization

### 1. Instance Types
- **Development**: t3.micro (free tier)
- **Production**: t3.medium or t3.large
- **High Traffic**: t3.xlarge or m5.large

### 2. Storage
- **GP2 SSD**: Good performance, reasonable cost
- **IO1 SSD**: High performance, higher cost
- **Magnetic**: Lowest cost, lowest performance

### 3. Reserved Instances
- Save up to 75% with 1-3 year commitments
- Good for production workloads

## 🔒 Security Best Practices

### 1. Network Security
- Use security groups to restrict access
- Only open necessary ports
- Use private subnets for databases

### 2. Access Control
- Use IAM roles instead of access keys
- Rotate SSH keys regularly
- Use strong passwords for databases

### 3. Monitoring
- Enable CloudWatch monitoring
- Set up alerts for unusual activity
- Monitor logs for security events

## 📞 Support

If you encounter issues:
1. Check the logs: `docker-compose -f docker-compose.aws.yml logs`
2. Verify environment variables are set correctly
3. Ensure all prerequisites are met
4. Check AWS security group configurations
5. Verify SSL certificates are valid
6. Test database connectivity

## 🎯 Next Steps

After successful deployment:
1. Set up automated backups
2. Configure monitoring and alerting
3. Implement CI/CD pipeline
4. Set up logging aggregation
5. Configure SSL certificate auto-renewal
6. Set up load balancing for high availability
7. Implement disaster recovery plan
