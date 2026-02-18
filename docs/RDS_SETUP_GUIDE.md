# 🗄️ AWS RDS Setup Guide for TeksiMap

This guide shows you how to set up an AWS RDS MySQL database for your TeksiMap backend.

## 🎯 **What is RDS?**

**RDS** = **Relational Database Service** - It's AWS's managed database service that:
- Automatically handles backups
- Provides high availability
- Manages security updates
- Scales automatically
- Is more reliable than running your own database

## 🚀 **Step 1: Create RDS Database**

### 1.1 Go to AWS Console
1. Log into [AWS Console](https://aws.amazon.com/console/)
2. Search for "RDS" in the services
3. Click "RDS"

### 1.2 Create Database
1. Click **"Create database"**
2. Choose **"Standard create"**
3. Choose **"MySQL"** as the engine
4. Choose **"MySQL 8.0"** as the version

### 1.3 Database Settings
```
Database name: teksimap_prod_db
Master username: teksimap_admin
Master password: [Create a strong password]
```

**⚠️ Important:** Remember your username and password!

### 1.4 Instance Configuration
```
DB instance class: db.t3.micro (Free tier eligible)
Storage: 20 GB
Storage type: General Purpose SSD (gp2)
```

### 1.5 Connectivity
```
VPC: Default VPC
Public access: Yes (for now - we'll secure it later)
VPC security group: Create new
Security group name: teksimap-db-sg
```

### 1.6 Security Group Rules
Add these rules to your database security group:

| Type | Port | Source | Description |
|------|------|--------|-------------|
| MySQL/Aurora | 3306 | Your EC2 security group | Allow EC2 to connect to database |

### 1.7 Additional Configuration
```
Database port: 3306
Database name: teksimap_prod_db
```

### 1.8 Create Database
1. Click **"Create database"**
2. Wait for it to be available (takes 5-10 minutes)

## 🔑 **Step 2: Get Connection Details**

### 2.1 Find Your Endpoint
1. Go to your RDS dashboard
2. Click on your database
3. Copy the **"Endpoint"** (looks like: `teksimap-db.abc123.us-east-1.rds.amazonaws.com`)

### 2.2 Update Your Environment File
Edit your `.env.production` file:

```bash
# AWS RDS Database Configuration
MYSQL_HOST=teksimap-db.abc123.us-east-1.rds.amazonaws.com
MYSQL_PORT=3306
MYSQL_DATABASE=teksimap_prod_db
MYSQL_USER=teksimap_admin
MYSQL_PASSWORD=your_strong_password_here
```

## 🔒 **Step 3: Secure Your Database**

### 3.1 Update Security Group
1. Go to EC2 → Security Groups
2. Find your EC2 security group
3. Add rule: **MySQL (3306)** from your EC2 security group

### 3.2 Remove Public Access (Optional)
1. Go to RDS → Databases
2. Click "Modify"
3. Under "Connectivity", set "Public access" to "No"
4. Apply immediately

## 🧪 **Step 4: Test Connection**

### 4.1 From Your EC2 Instance
```bash
# Test if you can reach the database
telnet your-rds-endpoint 3306

# Or test with MySQL client
mysql -h your-rds-endpoint -u teksimap_admin -p
```

### 4.2 From Your Local Machine (for testing)
```bash
# Install MySQL client if you don't have it
sudo apt install mysql-client

# Test connection
mysql -h your-rds-endpoint -u teksimap_admin -p
```

## 📊 **Step 5: Monitor Your Database**

### 5.1 RDS Dashboard
- **Monitoring**: CPU, memory, storage usage
- **Logs**: Database logs and errors
- **Backups**: Automatic daily backups

### 5.2 CloudWatch Alarms
Set up alerts for:
- High CPU usage
- Low storage space
- Connection count

## 💰 **Cost Optimization**

### 5.1 Free Tier
- **db.t3.micro**: Free for 12 months
- **20 GB storage**: Free for 12 months
- **20 GB backup storage**: Free for 12 months

### 5.2 After Free Tier
- **db.t3.micro**: ~$15/month
- **Storage**: ~$2.30/month per GB
- **Backups**: ~$0.095/month per GB

## 🚨 **Common Issues**

### Issue 1: "Can't connect to database"
**Solution**: Check security group rules

### Issue 2: "Access denied for user"
**Solution**: Verify username/password in `.env.production`

### Issue 3: "Connection timeout"
**Solution**: Check if database is in the same region as EC2

## ✅ **Success Checklist**

- [ ] RDS database created and available
- [ ] Endpoint copied to `.env.production`
- [ ] Username and password set
- [ ] Security group configured
- [ ] Connection tested successfully
- [ ] Environment variables updated

## 🎯 **Next Steps**

After RDS is set up:
1. Update your `.env.production` file
2. Run `./deploy-aws.sh` to deploy
3. Test your application
4. Set up monitoring and alerts

## 💡 **Pro Tips**

1. **Use the same region** for EC2 and RDS
2. **Start with t3.micro** and scale up if needed
3. **Enable automated backups** (they're cheap insurance)
4. **Use strong passwords** (you can generate them)
5. **Monitor costs** in AWS Cost Explorer

---

**Need Help?** Check the AWS RDS documentation or AWS support forums!
