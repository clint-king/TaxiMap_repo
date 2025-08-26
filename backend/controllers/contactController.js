import nodemailer from 'nodemailer';
import config from "../config/configurations.js";

// Create transporter using config
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});


// Send contact form email
export const sendContactEmail = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate input
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Email content
    const mailOptions = {
      from: config.email.user, // Use config for company email
      to: config.email.user, // Use config for company email
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">New Contact Form Submission</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Contact Details:</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <div style="background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #1e40af;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>This message was sent from the TaxiRoute contact form.</p>
            <p>Time: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ message: 'Message sent successfully! We will get back to you soon.' });

  } catch (error) {
    console.error('Error sending contact email:', error);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
};

export default {
  sendContactEmail
};
