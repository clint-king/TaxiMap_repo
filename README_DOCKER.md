# 🐳 TeksiMap Docker Setup

This directory contains everything you need to deploy your TeksiMap backend using Docker on AWS EC2 with AWS RDS.

## 📁 What's Included

### 🚀 Core Files
- **`docker-compose.yml`** - Local development setup
- **`docker-compose.prod.yml`** - Production deployment
- **`docker-compose.aws.yml`** - AWS EC2 specific configuration (with RDS)
- **`backend/Dockerfile`** - Backend container definition
- **`backend/.dockerignore`** - Files excluded from Docker build

### 🔧 Configuration
- **`nginx/nginx.aws.conf`** - Nginx reverse proxy configuration
- **`env.docker.template`** - Docker environment template
- **`env.production.template`** - Production environment template (RDS configured)

### 📜 Scripts
- **`quick-start.sh`** - Complete setup script
- **`test-docker-local.sh`** - Test Docker setup locally
- **`deploy-aws.sh`** - Deploy to AWS EC2
- **`generate-ssl.sh`** - Generate SSL certificates for testing

### 📚 Documentation
- **`DOCKER_DEPLOYMENT.md`** - Complete Docker deployment guide
- **`AWS_EC2_SETUP.md`** - Step-by-step AWS EC2 setup
- **`RDS_SETUP_GUIDE.md`** - AWS RDS database setup guide

## 🚀 Quick Start

### 1. Prerequisites
- Docker and Docker Compose installed
- AWS EC2 instance (for production deployment)
- AWS RDS MySQL database (recommended for production)

### 2. Setup Everything
```bash
# Make scripts executable and run quick start
chmod +x *.sh
./quick-start.sh
```

### 3. Test Locally
```bash
# Test the Docker setup locally
./test-docker-local.sh
```

### 4. Set Up RDS (Production)
```bash
# Follow RDS_SETUP_GUIDE.md to create your database
# Then deploy to AWS EC2
./deploy-aws.sh
```

## 🏗️ Architecture

```
Internet → EC2 Instance → Nginx (Port 80/443) → Backend API (Port 3000)
                                    ↓
                              Redis (Port 6379)
                                    ↓
                              AWS RDS MySQL Database
```

## 🔧 Configuration Options

### Database
- **AWS RDS**: Managed MySQL database (recommended for production)
- **External Database**: Any external MySQL server
- **Local Database**: Run MySQL in container (development only)

### SSL
- **Let's Encrypt**: Free SSL certificates (recommended for production)
- **Custom SSL**: Use your own certificates
- **Self-signed**: For testing only

### Environment
- **Development**: Uses `env.docker.template`
- **Production**: Uses `env.production.template` (configured for RDS)

## 📊 Features

### ✅ What's Included
- Multi-stage Docker build for optimization
- Health checks for all services
- Rate limiting and security headers
- Gzip compression
- Logging and monitoring
- Resource limits and scaling
- SSL/TLS support
- Reverse proxy with Nginx
- Redis for caching
- AWS RDS integration

### 🔒 Security Features
- Non-root user in containers
- Security headers
- Rate limiting
- SSL/TLS encryption
- Input validation
- CORS configuration
- Database security through AWS RDS

## 🚨 Troubleshooting

### Common Issues
1. **Port conflicts**: Check if ports 80, 443, 3000 are available
2. **Permission errors**: Ensure proper file permissions
3. **Database connection**: Verify RDS endpoint and credentials
4. **SSL issues**: Check certificate validity and paths

### Debug Commands
```bash
# View logs
docker-compose -f docker-compose.aws.yml logs

# Check service status
docker-compose -f docker-compose.aws.yml ps

# Test health endpoint
curl http://localhost/health

# Test database connection
docker exec -it teksimap_backend_aws sh
ping your-rds-endpoint
```

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale backend service
docker-compose -f docker-compose.aws.yml up -d --scale backend=3
```

### Load Balancing
- Use AWS Application Load Balancer
- Configure multiple EC2 instances
- Implement auto-scaling groups

### Database Scaling
- RDS automatically handles database scaling
- Use Multi-AZ for high availability
- Use Read Replicas for read-heavy workloads

## 💰 Cost Optimization

### Instance Types
- **Development**: t3.micro (free tier)
- **Production**: t3.medium or t3.large
- **High Traffic**: t3.xlarge or m5.large

### Storage
- **GP2 SSD**: Good performance, reasonable cost
- **IO1 SSD**: High performance, higher cost

### RDS Costs
- **db.t3.micro**: Free tier eligible, then ~$15/month
- **Storage**: ~$2.30/month per GB
- **Backups**: ~$0.095/month per GB

## 🔄 Maintenance

### Updates
```bash
# Pull latest code and rebuild
git pull origin main
docker-compose -f docker-compose.aws.yml down
docker-compose -f docker-compose.aws.yml up -d --build
```

### Backups
- RDS handles automatic daily backups
- Manual snapshots available
- Point-in-time recovery

### Monitoring
- Enable CloudWatch monitoring
- Set up RDS performance insights
- Configure alerts

## 📞 Support

### Documentation
- Read `DOCKER_DEPLOYMENT.md` for complete guide
- Read `AWS_EC2_SETUP.md` for AWS setup
- Read `RDS_SETUP_GUIDE.md` for database setup
- Check logs for debugging

### Common Commands
```bash
# Start services
docker-compose -f docker-compose.aws.yml up -d

# Stop services
docker-compose -f docker-compose.aws.yml down

# View logs
docker-compose -f docker-compose.aws.yml logs -f

# Check status
docker-compose -f docker-compose.aws.yml ps
```

## 🎯 Next Steps

After successful deployment:
1. Configure your domain DNS
2. Set up SSL certificates
3. Configure monitoring and alerting
4. Set up automated backups (RDS handles this)
5. Implement CI/CD pipeline
6. Configure load balancing
7. Set up disaster recovery

## 🏆 Success Checklist

- [ ] Docker and Docker Compose installed
- [ ] AWS RDS database created and configured
- [ ] Environment variables configured (including RDS endpoint)
- [ ] SSL certificates generated/installed
- [ ] Services running and healthy
- [ ] Health endpoint responding
- [ ] Database connectivity verified
- [ ] Domain DNS configured
- [ ] SSL working (HTTPS)
- [ ] Monitoring configured
- [ ] RDS backups enabled

## 🗄️ RDS Benefits

Using AWS RDS instead of local database:
- **Automatic backups** every day
- **High availability** with Multi-AZ
- **Security updates** handled automatically
- **Easy scaling** up or down
- **Professional monitoring** and alerts
- **Cost-effective** for production use

---

**Happy Deploying! 🚀**

For detailed information, see the individual documentation files in this directory.
