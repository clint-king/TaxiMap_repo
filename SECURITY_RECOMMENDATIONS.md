# AWS EC2 Security Group Recommendations

## Current Security Issues

### ⚠️ CRITICAL: Port 3000 is Publicly Exposed

**Problem:** Your backend API (port 3000) is directly accessible from the internet (0.0.0.0/0).

**Risk:**
- Attackers can bypass nginx security features (rate limiting, SSL, security headers)
- Direct access to your API without authentication checks
- Potential for DDoS attacks directly on your backend
- Exposure of API endpoints that should be protected

**Solution:**
1. **Remove the inbound rule for port 3000 from 0.0.0.0/0**
2. The backend should only be accessible through nginx (ports 80/443)
3. If using Docker, the backend should only be accessible within the Docker network

## Recommended Security Group Configuration

### Inbound Rules (What should be allowed):

1. **Port 80 (HTTP)** - `0.0.0.0/0`
   - ✅ Keep this - needed for HTTP to HTTPS redirect
   
2. **Port 443 (HTTPS)** - `0.0.0.0/0`
   - ✅ Keep this - needed for secure web traffic
   
3. **Port 22 (SSH)** - `197.185.186.189/32` (or your specific IP)
   - ✅ Keep this - SSH restricted to your IP is good practice
   - Consider using AWS Systems Manager Session Manager for even better security
   
4. **Port 3000 (Backend)** - ❌ **REMOVE THIS RULE**
   - The backend should NOT be publicly accessible
   - Nginx should proxy all requests to the backend internally

### Outbound Rules:

- ✅ Current configuration (all traffic) is fine for outbound

## How to Fix

### Step 1: Remove Port 3000 Inbound Rule

1. Go to AWS EC2 Console
2. Navigate to **Security Groups**
3. Select your security group (`launch-wizard-1`)
4. Go to **Inbound rules** tab
5. Find the rule for port 3000 (TCP, 0.0.0.0/0)
6. Click **Edit inbound rules**
7. Delete the port 3000 rule
8. Click **Save rules**

### Step 2: Verify Your Setup

After removing the rule, verify:
- Your website still works (traffic goes through nginx on 443)
- Backend API is accessible through nginx proxy
- Direct access to `http://your-ec2-ip:3000` should fail (this is expected and good!)

## Architecture Overview

```
Internet → Port 443 (HTTPS) → Nginx → Docker Network → Backend:3000
         → Port 80 (HTTP) → Nginx (redirects to HTTPS)
         → Port 22 (SSH) → Your IP only
```

**Port 3000 should NOT be in this diagram from the internet side!**

## Additional Security Recommendations

1. **Use AWS WAF** - Add Web Application Firewall for additional protection
2. **Enable CloudWatch Logs** - Monitor for suspicious activity
3. **Regular Security Audits** - Review security group rules periodically
4. **Use AWS Systems Manager** - Instead of direct SSH access
5. **Implement IP Whitelisting** - If possible, restrict admin access to specific IPs
6. **Enable VPC Flow Logs** - Monitor network traffic

## Testing After Changes

1. Test your website - should work normally
2. Test API endpoints through nginx - should work
3. Try direct access to port 3000 - should fail (this is good!)
4. Verify SSH access still works from your IP

