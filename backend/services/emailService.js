const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000
});

async function sendCredentialEmail(toEmail, userData, temporaryPassword, userType) {
  const portalName = userType === 'lawfirm' ? 'Law Firm Portal' : 'Medical Provider Portal';
  const loginUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/portal`;
  
  const mailOptions = {
    from: `"Verdict Path" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Your ${portalName} Account Credentials`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #d4af37; border-radius: 4px; }
          .credential-item { margin: 15px 0; }
          .label { font-weight: bold; color: #1e3a5f; }
          .value { font-family: 'Courier New', monospace; background: #f0f0f0; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .button { display: inline-block; background: #d4af37; color: #1e3a5f; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏴‍☠️ Welcome to Verdict Path</h1>
            <p>${portalName}</p>
          </div>
          <div class="content">
            <p>Hello <strong>${userData.firstName} ${userData.lastName}</strong>,</p>
            
            <p>Your ${portalName} account has been created successfully. Below are your login credentials:</p>
            
            <div class="credentials">
              <div class="credential-item">
                <div class="label">Email:</div>
                <div class="value">${userData.email}</div>
              </div>
              <div class="credential-item">
                <div class="label">Temporary Password:</div>
                <div class="value">${temporaryPassword}</div>
              </div>
              ${userData.userCode ? `
              <div class="credential-item">
                <div class="label">User Code:</div>
                <div class="value">${userData.userCode}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This is a <strong>temporary password</strong> that expires in 72 hours</li>
                <li>You must change this password on your first login</li>
                <li>Never share your password with anyone</li>
                <li>Choose a strong, unique password when changing it</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Login to Your Account</a>
            </div>
            
            <p>If you didn't expect this email or have any questions, please contact your administrator immediately.</p>
          </div>
          <div class="footer">
            <p>This email was sent from Verdict Path - Legal Case Management Platform</p>
            <p>&copy; ${new Date().getFullYear()} Verdict Path. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('⚠️ SMTP not configured, skipping email send');
      return { success: false, error: 'Email service not configured' };
    }
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Credential email sent to ${toEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send credential email to ${toEmail}:`, error);
    return { success: false, error: error.message };
  }
}

async function sendPasswordChangeConfirmation(toEmail, userName, userType) {
  const portalName = userType === 'lawfirm' ? 'Law Firm Portal' : 'Medical Provider Portal';
  
  const mailOptions = {
    from: `"Verdict Path" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Password Successfully Changed',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; color: #155724; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Changed Successfully</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            
            <div class="success">
              Your ${portalName} password has been successfully changed.
            </div>
            
            <p>If you did not make this change, please contact your administrator immediately.</p>
            
            <p>For security, we recommend:</p>
            <ul>
              <li>Using a unique password for this account</li>
              <li>Never sharing your password</li>
              <li>Changing your password regularly</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password change confirmation sent to ${toEmail}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send password change confirmation to ${toEmail}:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendCredentialEmail,
  sendPasswordChangeConfirmation
};
