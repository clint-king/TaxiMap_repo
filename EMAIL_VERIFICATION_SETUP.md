# Email Verification Setup Guide

This guide will help you set up email verification for manual user registration in your TeksiMap application.

## 🚀 Features Implemented

- ✅ Email verification for manual registration
- ✅ Beautiful verification email templates
- ✅ Verification token generation and validation
- ✅ Resend verification email functionality
- ✅ User-friendly verification page
- ✅ Integration with existing social authentication
- ✅ Automatic email verification for social users

## 📋 Prerequisites

1. **Node.js** (v14 or higher)
2. **MySQL** database
3. **Email Service Provider** (Gmail, Outlook, SendGrid, etc.)

## 🔧 Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Database Migration

Run the SQL migration to add email verification fields:

```sql
-- Run this in your MySQL database
ALTER TABLE users 
ADD COLUMN verification_token VARCHAR(255) NULL,
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_token_expires TIMESTAMP NULL;

-- Add index for verification token
CREATE INDEX idx_verification_token ON users(verification_token);

-- Update existing users to have verified email (for backward compatibility)
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;

-- Add unique constraint for verification token
ALTER TABLE users 
ADD CONSTRAINT unique_verification_token UNIQUE (verification_token);
```

### 3. Email Configuration

Create a `.env` file in the backend directory with email settings:

```env
# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:5174

# Social Authentication Credentials (existing)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
# ... other social auth credentials
```

## 📧 Email Service Setup

### Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in your `EMAIL_PASS` environment variable

### Other Email Providers

#### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your_sendgrid_api_key
```

#### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your_password
```

#### Custom SMTP Server
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_USER=your-username
EMAIL_PASS=your_password
```

## 🎨 Frontend Setup

### 1. Test Email Configuration

Test your email setup by running:

```javascript
// In your backend, you can test the email connection
import { testEmailConnection } from './services/emailService.js';

testEmailConnection().then(isConnected => {
  console.log('Email connection:', isConnected ? 'Success' : 'Failed');
});
```

### 2. Update Frontend Configuration

Ensure your frontend is pointing to the correct backend URL in `frontend/js/AddressSelection.js`:

```javascript
export const BASE_URL = 'http://localhost:3000/api';
```

## 🔄 API Endpoints

The following new endpoints are now available:

- `POST /auth/signup` - User registration with email verification
- `GET /auth/verify/:token` - Verify email with token
- `POST /auth/resend-verification` - Resend verification email
- `POST /auth/login` - Login (now checks email verification)

## 📱 User Flow

### Manual Registration Flow:
1. User fills out registration form
2. System creates user account with `email_verified = false`
3. Verification email is sent automatically
4. User clicks verification link in email
5. Email is verified and user can now login

### Social Authentication Flow:
1. User clicks social login button
2. System creates/retrieves user account
3. Email is automatically verified (`email_verified = true`)
4. User is logged in immediately

### Login Flow:
1. User attempts to login
2. System checks if email is verified (for manual users only)
3. If not verified, shows error message with resend option
4. If verified, login proceeds normally

## 🔒 Security Features

1. **Token Expiration**: Verification tokens expire after 24 hours
2. **Unique Tokens**: Each token is unique and can only be used once
3. **Secure Email**: Uses SMTP with TLS encryption
4. **Rate Limiting**: Consider implementing rate limiting for email sending
5. **Token Validation**: Server-side validation of all tokens

## 🐛 Troubleshooting

### Common Issues

1. **Email Not Sending**:
   - Check email credentials in `.env` file
   - Verify SMTP settings
   - Check if 2FA is enabled for Gmail
   - Test email connection using `testEmailConnection()`

2. **Verification Link Not Working**:
   - Check `FRONTEND_URL` in environment variables
   - Ensure `verify-email.html` is accessible
   - Verify token format in database

3. **Database Errors**:
   - Run the migration script
   - Check database connection
   - Verify table structure

4. **CORS Issues**:
   - Ensure backend CORS settings include frontend domain
   - Check if `withCredentials` is set correctly

### Debug Mode

Enable debug logging by adding to your backend:

```javascript
// In backend/controllers/AuthController.js
console.log('Signup attempt:', { name, email, hasVerificationToken: !!verificationToken });

// In backend/services/emailService.js
console.log('Email configuration:', { host: emailConfig.host, user: emailConfig.auth.user });
```

## 📧 Email Templates

The system includes beautiful HTML email templates for:

- **Verification Email**: Welcome message with verification button
- **Password Reset Email**: Password reset functionality (ready for future use)

### Customizing Email Templates

Edit the templates in `backend/services/emailService.js`:

```javascript
// Customize the verification email template
const mailOptions = {
  from: `"Your App Name" <${emailConfig.auth.user}>`,
  to: email,
  subject: 'Your Custom Subject',
  html: `
    // Your custom HTML template
  `
};
```

## 🔄 Integration with Social Auth

The email verification system is designed to work seamlessly with social authentication:

- **Social users**: Automatically verified, no email verification required
- **Manual users**: Must verify email before login
- **Mixed accounts**: System handles both types appropriately

## 📱 Mobile Considerations

The verification page is fully responsive and works on all devices:

- Mobile-friendly design
- Touch-optimized buttons
- Responsive email templates
- Cross-platform compatibility

## 🆘 Support

If you encounter issues:

1. Check browser console for JavaScript errors
2. Check server logs for backend errors
3. Verify email configuration in `.env` file
4. Test email connection using the provided test function
5. Ensure database migration has been completed
6. Check if all required files are in place

## 📝 Notes

- Email verification is only required for manual registration
- Social authentication users are automatically verified
- Verification tokens expire after 24 hours
- Users can resend verification emails if needed
- The system gracefully handles email sending failures
- All email templates are responsive and professional

---

**Happy Coding! 🚀** 