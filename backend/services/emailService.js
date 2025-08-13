import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Dynamic email configuration function
const getEmailConfig = () => {
  return {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  };
};

// Create transporter dynamically
const createTransporter = () => {
  const emailConfig = getEmailConfig();
  return nodemailer.createTransport(emailConfig);
};

// Generate verification token
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
export const sendVerificationEmail = async (email, name, verificationToken) => {
  const emailConfig = getEmailConfig();
  const transporter = createTransporter();
  
  console.log("[FROM EMAIL SERVICE] app email : " , emailConfig.auth.user);
  console.log("[FROM EMAIL SERVICE] app email pass : " , emailConfig.auth.pass);

  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/verify-email.html?token=${verificationToken}`;
  
  const mailOptions = {
    from: `"TeksiMap" <${emailConfig.auth.user}>`,
    to: email,
    subject: 'Verify Your Email - TeksiMap',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #01386A, #001f3f); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">TeksiMap</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Email Verification</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #01386A; margin-bottom: 20px;">Hello ${name}!</h2>
          
          <p style="color: #495057; line-height: 1.6; margin-bottom: 25px;">
            Thank you for registering with TeksiMap! To complete your registration and start using our services, 
            please verify your email address by clicking the button below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #FFD737; color: #01386A; padding: 15px 30px; text-decoration: none; 
                      border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px; margin-bottom: 20px;">
            If the button doesn't work, you can copy and paste this link into your browser:
          </p>
          
          <p style="background: #e9ecef; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 14px; color: #495057;">
            ${verificationUrl}
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 14px; margin-bottom: 10px;">
              <strong>Important:</strong>
            </p>
            <ul style="color: #6c757d; font-size: 14px; line-height: 1.5;">
              <li>This verification link will expire in 24 hours</li>
              <li>If you didn't create this account, you can safely ignore this email</li>
              <li>For security reasons, please don't share this link with anyone</li>
            </ul>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>© 2024 TeksiMap. All rights reserved.</p>
          <p>This email was sent to ${email}</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, name, resetToken) => {
  const emailConfig = getEmailConfig();
  const transporter = createTransporter();
  
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/reset-password.html?token=${resetToken}`;
  
  const mailOptions = {
    from: `"TeksiMap" <${emailConfig.auth.user}>`,
    to: email,
    subject: 'Reset Your Password - TeksiMap',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #01386A, #001f3f); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">TeksiMap</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #01386A; margin-bottom: 20px;">Hello ${name}!</h2>
          
          <p style="color: #495057; line-height: 1.6; margin-bottom: 25px;">
            We received a request to reset your password for your TeksiMap account. 
            Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #FFD737; color: #01386A; padding: 15px 30px; text-decoration: none; 
                      border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px; margin-bottom: 20px;">
            If the button doesn't work, you can copy and paste this link into your browser:
          </p>
          
          <p style="background: #e9ecef; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 14px; color: #495057;">
            ${resetUrl}
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 14px; margin-bottom: 10px;">
              <strong>Security Notice:</strong>
            </p>
            <ul style="color: #6c757d; font-size: 14px; line-height: 1.5;">
              <li>This reset link will expire in 1 hour</li>
              <li>If you didn't request a password reset, you can safely ignore this email</li>
              <li>For security reasons, please don't share this link with anyone</li>
            </ul>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>© 2024 TeksiMap. All rights reserved.</p>
          <p>This email was sent to ${email}</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
export const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email server connection verified successfully');
    return true;
  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
}; 