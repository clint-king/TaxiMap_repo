#!/bin/bash

# Generate Self-Signed SSL Certificate for Testing
# WARNING: This is for testing only. Use Let's Encrypt for production.

echo "🔐 Generating self-signed SSL certificate for testing..."

# Create SSL directory if it doesn't exist
mkdir -p nginx/ssl

# Generate private key
openssl genrsa -out nginx/ssl/key.pem 2048

# Generate certificate signing request
openssl req -new -key nginx/ssl/key.pem -out nginx/ssl/cert.csr -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=TeksiMap/OU=IT/CN=localhost"

# Generate self-signed certificate (valid for 365 days)
openssl x509 -req -days 365 -in nginx/ssl/cert.csr -signkey nginx/ssl/key.pem -out nginx/ssl/cert.pem

# Remove the CSR file
rm nginx/ssl/cert.csr

# Set proper permissions
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem

echo "✅ SSL certificate generated successfully!"
echo "📁 Certificate files created in nginx/ssl/"
echo "🔑 Private key: nginx/ssl/key.pem"
echo "📜 Certificate: nginx/ssl/cert.pem"
echo ""
echo "⚠️  WARNING: This is a self-signed certificate for testing only!"
echo "🚀 For production, use Let's Encrypt or purchase a valid SSL certificate."
echo ""
echo "🔍 To verify the certificate:"
echo "   openssl x509 -in nginx/ssl/cert.pem -text -noout"
