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

const getBaseUrl = () => {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return process.env.BASE_URL || 'http://localhost:5000';
};

const baseStyles = `
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
  .header h1 { margin: 0 0 10px 0; }
  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
  .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #d4af37; border-radius: 4px; }
  .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; color: #155724; }
  .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
  .alert-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px; color: #721c24; }
  .info-blue-box { background: #cce5ff; border-left: 4px solid #004085; padding: 15px; margin: 20px 0; border-radius: 4px; color: #004085; }
  .button { display: inline-block; background: #d4af37; color: #1e3a5f; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
  .button-secondary { display: inline-block; background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
  .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  .label { font-weight: bold; color: #1e3a5f; }
  .value { font-family: 'Courier New', monospace; background: #f0f0f0; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; }
  .detail-row { margin: 10px 0; }
  .amount { font-size: 24px; font-weight: bold; color: #28a745; }
  .priority-high { color: #dc3545; font-weight: bold; }
  .priority-medium { color: #ffc107; font-weight: bold; }
  .priority-low { color: #28a745; font-weight: bold; }
`;

const emailFooter = `
  <div class="footer">
    <p>This email was sent from Verdict Path - Legal Case Management Platform</p>
    <p>&copy; ${new Date().getFullYear()} Verdict Path. All rights reserved.</p>
    <p style="font-size: 10px; color: #999;">If you no longer wish to receive these emails, you can manage your notification preferences in the app.</p>
  </div>
`;

async function sendEmail(toEmail, subject, htmlContent) {
  const mailOptions = {
    from: `"Verdict Path" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: toEmail,
    subject: subject,
    html: htmlContent
  };

  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      return { success: false, error: 'Email service not configured' };
    }
    
    const sendEmailPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000)
    );
    
    const info = await Promise.race([sendEmailPromise, timeoutPromise]);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// CREDENTIAL & AUTHENTICATION EMAILS
// ============================================================================

async function sendCredentialEmail(toEmail, userData, temporaryPassword, userType) {
  const portalName = userType === 'lawfirm' ? 'Law Firm Portal' : 'Medical Provider Portal';
  const loginUrl = `${getBaseUrl()}/portal`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Verdict Path</h1>
          <p>${portalName}</p>
        </div>
        <div class="content">
          <p>Hello <strong>${userData.firstName} ${userData.lastName}</strong>,</p>
          <p>Your ${portalName} account has been created successfully. Below are your login credentials:</p>
          
          <div class="info-box">
            <div class="detail-row">
              <div class="label">Email:</div>
              <div class="value">${userData.email}</div>
            </div>
            <div class="detail-row">
              <div class="label">Temporary Password:</div>
              <div class="value">${temporaryPassword}</div>
            </div>
            ${userData.userCode ? `
            <div class="detail-row">
              <div class="label">User Code:</div>
              <div class="value">${userData.userCode}</div>
            </div>
            ` : ''}
          </div>
          
          <div class="warning-box">
            <strong>Security Notice:</strong>
            <ul>
              <li>This is a <strong>temporary password</strong> that expires in 72 hours</li>
              <li>You must change this password on your first login</li>
              <li>Never share your password with anyone</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Login to Your Account</a>
          </div>
          
          <p>If you didn't expect this email, please contact your administrator immediately.</p>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `Your ${portalName} Account Credentials`, html);
}

async function sendPasswordChangeConfirmation(toEmail, userName, userType) {
  const portalName = userType === 'lawfirm' ? 'Law Firm Portal' : 
                     userType === 'medical_provider' ? 'Medical Provider Portal' : 'Verdict Path';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Changed Successfully</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          
          <div class="success-box">
            Your ${portalName} password has been successfully changed.
          </div>
          
          <p>If you did not make this change, please contact support immediately.</p>
          
          <p>For security, we recommend:</p>
          <ul>
            <li>Using a unique password for this account</li>
            <li>Never sharing your password</li>
            <li>Changing your password regularly</li>
          </ul>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, 'Password Successfully Changed', html);
}

async function sendWelcomeEmail(toEmail, userName, userType) {
  const appName = userType === 'individual' ? 'Verdict Path Mobile App' : 
                  userType === 'lawfirm' ? 'Law Firm Portal' : 'Medical Provider Portal';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome Aboard!</h1>
          <p>Your Legal Journey Begins</p>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          
          <p>Welcome to Verdict Path! Your account has been successfully created.</p>
          
          <div class="info-box">
            <h3>What's Next?</h3>
            <ul>
              <li>Complete your profile setup</li>
              <li>Explore the interactive case roadmap</li>
              <li>Connect with your legal team</li>
              <li>Upload important documents securely</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">Open ${appName}</a>
          </div>
          
          <p>If you have any questions, our support team is here to help!</p>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, 'Welcome to Verdict Path!', html);
}

async function sendSecurityAlertEmail(toEmail, userName, alertData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
          <h1>Security Alert</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          
          <div class="alert-box">
            <strong>New Login Detected</strong>
            <p>We detected a login to your account from a new device or location.</p>
          </div>
          
          <div class="info-box">
            <div class="detail-row"><strong>Time:</strong> ${alertData.timestamp || new Date().toLocaleString()}</div>
            <div class="detail-row"><strong>Device:</strong> ${alertData.device || 'Unknown'}</div>
            <div class="detail-row"><strong>Location:</strong> ${alertData.location || 'Unknown'}</div>
            <div class="detail-row"><strong>IP Address:</strong> ${alertData.ipAddress || 'Unknown'}</div>
          </div>
          
          <p>If this was you, no action is needed.</p>
          
          <p><strong>If this wasn't you:</strong></p>
          <ul>
            <li>Change your password immediately</li>
            <li>Review your recent account activity</li>
            <li>Contact support if you notice any suspicious activity</li>
          </ul>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, 'Security Alert: New Login Detected', html);
}

// ============================================================================
// TASK EMAILS (For Individual Clients)
// ============================================================================

async function sendTaskAssignedEmail(toEmail, clientName, taskData) {
  const priorityClass = taskData.priority === 'high' ? 'priority-high' : 
                        taskData.priority === 'medium' ? 'priority-medium' : 'priority-low';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Task Assigned</h1>
          <p>Action Required</p>
        </div>
        <div class="content">
          <p>Hello <strong>${clientName}</strong>,</p>
          
          <p>Your attorney has assigned you a new task:</p>
          
          <div class="info-box">
            <h3>${taskData.title}</h3>
            <p>${taskData.description || 'No description provided.'}</p>
            
            <div class="detail-row">
              <strong>Priority:</strong> <span class="${priorityClass}">${(taskData.priority || 'normal').toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <strong>Due Date:</strong> ${taskData.dueDate ? new Date(taskData.dueDate).toLocaleDateString() : 'No due date'}
            </div>
            ${taskData.coinReward ? `
            <div class="detail-row">
              <strong>Coin Reward:</strong> ${taskData.coinReward} coins
            </div>
            ` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">View Task in App</a>
          </div>
          
          <p>Complete this task on time to earn coins and keep your case on track!</p>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `New Task: ${taskData.title}`, html);
}

async function sendTaskReminderEmail(toEmail, clientName, taskData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);">
          <h1>Task Reminder</h1>
          <p>Due Soon</p>
        </div>
        <div class="content">
          <p>Hello <strong>${clientName}</strong>,</p>
          
          <div class="warning-box">
            <strong>Reminder:</strong> You have a task due ${taskData.dueSoon || 'soon'}!
          </div>
          
          <div class="info-box">
            <h3>${taskData.title}</h3>
            <p>${taskData.description || 'No description provided.'}</p>
            
            <div class="detail-row">
              <strong>Due Date:</strong> ${taskData.dueDate ? new Date(taskData.dueDate).toLocaleDateString() : 'Soon'}
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">Complete Task Now</a>
          </div>
          
          <p>Don't forget to complete your task to keep your case moving forward!</p>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `Reminder: Task "${taskData.title}" Due Soon`, html);
}

async function sendTaskCompletedEmail(toEmail, lawFirmName, taskData, clientName) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Task Completed</h1>
          <p>Client Update</p>
        </div>
        <div class="content">
          <p>Hello <strong>${lawFirmName}</strong>,</p>
          
          <div class="success-box">
            <strong>${clientName}</strong> has completed a task!
          </div>
          
          <div class="info-box">
            <h3>${taskData.title}</h3>
            <div class="detail-row">
              <strong>Completed On:</strong> ${new Date().toLocaleDateString()}
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}/portal" class="button">View in Portal</a>
          </div>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `Task Completed by ${clientName}`, html);
}

// ============================================================================
// SETTLEMENT & DISBURSEMENT EMAILS
// ============================================================================

async function sendSettlementCreatedEmail(toEmail, clientName, settlementData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Settlement Update</h1>
          <p>Important Case Information</p>
        </div>
        <div class="content">
          <p>Hello <strong>${clientName}</strong>,</p>
          
          <p>Great news! A settlement has been created for your case.</p>
          
          <div class="info-box">
            <div class="detail-row">
              <strong>Case:</strong> ${settlementData.caseName || 'Your Case'}
            </div>
            <div class="detail-row">
              <strong>Insurance Company:</strong> ${settlementData.insuranceCompanyName}
            </div>
            <div class="detail-row">
              <strong>Settlement Amount:</strong> <span class="amount">$${parseFloat(settlementData.grossSettlementAmount).toLocaleString()}</span>
            </div>
          </div>
          
          <div class="info-blue-box">
            <strong>What's Next?</strong>
            <p>Your attorney will process the settlement and handle all disbursements. You'll receive updates as funds are distributed.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">View Details in App</a>
          </div>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, 'Settlement Created for Your Case', html);
}

async function sendDisbursementProcessedEmail(toEmail, recipientName, disbursementData, recipientType) {
  const methodLabels = {
    'app_transfer': 'Direct Deposit (Stripe)',
    'check_mailed': 'Check Mailed',
    'wire_transfer': 'Wire Transfer',
    'client_pickup': 'In-Person Pickup'
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #28a745 0%, #218838 100%);">
          <h1>Payment Sent!</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${recipientName}</strong>,</p>
          
          <div class="success-box">
            <p style="font-size: 18px;">A payment has been processed for you!</p>
            <p class="amount">$${parseFloat(disbursementData.amount).toLocaleString()}</p>
          </div>
          
          <div class="info-box">
            <div class="detail-row">
              <strong>Payment Method:</strong> ${methodLabels[disbursementData.method] || disbursementData.method}
            </div>
            <div class="detail-row">
              <strong>Reference:</strong> ${disbursementData.referenceId || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>Date:</strong> ${new Date().toLocaleDateString()}
            </div>
            ${disbursementData.caseName ? `
            <div class="detail-row">
              <strong>Case:</strong> ${disbursementData.caseName}
            </div>
            ` : ''}
          </div>
          
          ${disbursementData.method === 'app_transfer' ? `
          <div class="info-blue-box">
            <strong>Direct Deposit:</strong> Funds will appear in your connected bank account within 2-3 business days.
          </div>
          ` : disbursementData.method === 'check_mailed' ? `
          <div class="info-blue-box">
            <strong>Check Mailed:</strong> Your check has been mailed and should arrive within 5-7 business days.
          </div>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">View Payment Details</a>
          </div>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `Payment of $${parseFloat(disbursementData.amount).toLocaleString()} Processed`, html);
}

async function sendLienPaymentEmail(toEmail, providerName, paymentData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #28a745 0%, #218838 100%);">
          <h1>Lien Payment Received</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${providerName}</strong>,</p>
          
          <div class="success-box">
            <p>A medical lien payment has been processed!</p>
            <p class="amount">$${parseFloat(paymentData.amount).toLocaleString()}</p>
          </div>
          
          <div class="info-box">
            <div class="detail-row">
              <strong>Patient:</strong> ${paymentData.patientName}
            </div>
            <div class="detail-row">
              <strong>Law Firm:</strong> ${paymentData.lawFirmName}
            </div>
            <div class="detail-row">
              <strong>Original Lien:</strong> $${parseFloat(paymentData.originalLienAmount || paymentData.amount).toLocaleString()}
            </div>
            <div class="detail-row">
              <strong>Payment Date:</strong> ${new Date().toLocaleDateString()}
            </div>
          </div>
          
          <div class="info-blue-box">
            Funds will be deposited to your connected account within 2-3 business days.
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">View in Dashboard</a>
          </div>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `Lien Payment Received: $${parseFloat(paymentData.amount).toLocaleString()}`, html);
}

async function sendIOLTADepositConfirmationEmail(toEmail, lawFirmName, depositData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>IOLTA Deposit Confirmed</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${lawFirmName}</strong>,</p>
          
          <div class="success-box">
            <p>Settlement deposit has been recorded.</p>
            <p class="amount">$${parseFloat(depositData.amount).toLocaleString()}</p>
          </div>
          
          <div class="info-box">
            <div class="detail-row">
              <strong>Client:</strong> ${depositData.clientName}
            </div>
            <div class="detail-row">
              <strong>Case:</strong> ${depositData.caseName}
            </div>
            <div class="detail-row">
              <strong>Reference Number:</strong> ${depositData.referenceNumber || 'N/A'}
            </div>
            <div class="detail-row">
              <strong>Deposit Date:</strong> ${depositData.depositDate ? new Date(depositData.depositDate).toLocaleDateString() : new Date().toLocaleDateString()}
            </div>
          </div>
          
          <div class="info-blue-box">
            You can now proceed with disbursements from the settlement dashboard.
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}/portal" class="button">Manage Disbursements</a>
          </div>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, 'IOLTA Deposit Confirmed', html);
}

// ============================================================================
// MESSAGE NOTIFICATION EMAILS
// ============================================================================

async function sendNewMessageEmail(toEmail, recipientName, messageData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Message</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${recipientName}</strong>,</p>
          
          <p>You have received a new message:</p>
          
          <div class="info-box">
            <div class="detail-row">
              <strong>From:</strong> ${messageData.senderName}
            </div>
            <div class="detail-row">
              <strong>Time:</strong> ${messageData.timestamp ? new Date(messageData.timestamp).toLocaleString() : new Date().toLocaleString()}
            </div>
            ${messageData.preview ? `
            <div style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 4px; font-style: italic;">
              "${messageData.preview.substring(0, 100)}${messageData.preview.length > 100 ? '...' : ''}"
            </div>
            ` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">Read Message</a>
          </div>
          
          <p style="font-size: 12px; color: #666;">For your privacy, message content is encrypted and can only be viewed in the app.</p>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `New Message from ${messageData.senderName}`, html);
}

// ============================================================================
// DOCUMENT UPLOAD EMAILS
// ============================================================================

async function sendDocumentUploadedEmail(toEmail, recipientName, documentData, uploaderInfo) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Document Uploaded</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${recipientName}</strong>,</p>
          
          <p>A new document has been uploaded to your case:</p>
          
          <div class="info-box">
            <div class="detail-row">
              <strong>Document:</strong> ${documentData.fileName || 'Document'}
            </div>
            <div class="detail-row">
              <strong>Type:</strong> ${documentData.documentType || 'General'}
            </div>
            <div class="detail-row">
              <strong>Uploaded By:</strong> ${uploaderInfo.name}
            </div>
            <div class="detail-row">
              <strong>Date:</strong> ${new Date().toLocaleDateString()}
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">View Document</a>
          </div>
          
          <p style="font-size: 12px; color: #666;">All documents are stored securely with HIPAA-compliant encryption.</p>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `New Document: ${documentData.fileName || 'Document Uploaded'}`, html);
}

// ============================================================================
// CONNECTION REQUEST EMAILS
// ============================================================================

async function sendConnectionRequestEmail(toEmail, recipientName, requestData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Connection Request</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${recipientName}</strong>,</p>
          
          <p>You have a new connection request:</p>
          
          <div class="info-box">
            <div class="detail-row">
              <strong>From:</strong> ${requestData.requesterName}
            </div>
            <div class="detail-row">
              <strong>Type:</strong> ${requestData.requesterType || 'User'}
            </div>
            ${requestData.message ? `
            <div class="detail-row">
              <strong>Message:</strong> ${requestData.message}
            </div>
            ` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">Review Request</a>
          </div>
          
          <p>You can accept or decline this request from your dashboard.</p>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `New Connection Request from ${requestData.requesterName}`, html);
}

async function sendConnectionAcceptedEmail(toEmail, userName, connectionData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Connection Accepted!</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          
          <div class="success-box">
            <strong>${connectionData.acceptedByName}</strong> has accepted your connection request!
          </div>
          
          <p>You can now:</p>
          <ul>
            <li>Send and receive secure messages</li>
            <li>Share documents securely</li>
            <li>Collaborate on case matters</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">Start Collaborating</a>
          </div>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `${connectionData.acceptedByName} Accepted Your Connection`, html);
}

// ============================================================================
// NEGOTIATION EMAILS
// ============================================================================

async function sendNegotiationOfferEmail(toEmail, recipientName, negotiationData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Negotiation Offer</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${recipientName}</strong>,</p>
          
          <p>You have received a new negotiation offer:</p>
          
          <div class="info-box">
            <div class="detail-row">
              <strong>From:</strong> ${negotiationData.fromName}
            </div>
            <div class="detail-row">
              <strong>Patient:</strong> ${negotiationData.patientName}
            </div>
            <div class="detail-row">
              <strong>Original Amount:</strong> $${parseFloat(negotiationData.originalAmount).toLocaleString()}
            </div>
            <div class="detail-row">
              <strong>Offer Amount:</strong> <span class="amount">$${parseFloat(negotiationData.offerAmount).toLocaleString()}</span>
            </div>
            ${negotiationData.message ? `
            <div class="detail-row">
              <strong>Message:</strong> ${negotiationData.message}
            </div>
            ` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">Review Offer</a>
          </div>
          
          <p>You can accept, counter, or decline this offer from your dashboard.</p>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `New Negotiation Offer: $${parseFloat(negotiationData.offerAmount).toLocaleString()}`, html);
}

async function sendNegotiationResponseEmail(toEmail, recipientName, negotiationData) {
  const statusColors = {
    'accepted': '#28a745',
    'countered': '#ffc107',
    'declined': '#dc3545'
  };
  
  const statusLabels = {
    'accepted': 'Accepted',
    'countered': 'Counter Offer',
    'declined': 'Declined'
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, ${statusColors[negotiationData.status] || '#1e3a5f'} 0%, ${statusColors[negotiationData.status] || '#2c5282'} 100%);">
          <h1>Negotiation ${statusLabels[negotiationData.status] || 'Update'}</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${recipientName}</strong>,</p>
          
          <p>There's an update on your negotiation:</p>
          
          <div class="info-box">
            <div class="detail-row">
              <strong>From:</strong> ${negotiationData.responderName}
            </div>
            <div class="detail-row">
              <strong>Patient:</strong> ${negotiationData.patientName}
            </div>
            <div class="detail-row">
              <strong>Status:</strong> <strong style="color: ${statusColors[negotiationData.status]}">${statusLabels[negotiationData.status] || negotiationData.status}</strong>
            </div>
            ${negotiationData.counterAmount ? `
            <div class="detail-row">
              <strong>Counter Amount:</strong> $${parseFloat(negotiationData.counterAmount).toLocaleString()}
            </div>
            ` : ''}
            ${negotiationData.message ? `
            <div class="detail-row">
              <strong>Message:</strong> ${negotiationData.message}
            </div>
            ` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">View Details</a>
          </div>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `Negotiation ${statusLabels[negotiationData.status] || 'Update'}`, html);
}

// ============================================================================
// CALENDAR EVENT EMAILS
// ============================================================================

async function sendCalendarEventEmail(toEmail, recipientName, eventData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Appointment Scheduled</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${recipientName}</strong>,</p>
          
          <p>A new appointment has been scheduled for you:</p>
          
          <div class="info-box">
            <div class="detail-row">
              <strong>Event:</strong> ${eventData.title}
            </div>
            <div class="detail-row">
              <strong>Date:</strong> ${new Date(eventData.date).toLocaleDateString()}
            </div>
            <div class="detail-row">
              <strong>Time:</strong> ${eventData.time || 'TBD'}
            </div>
            ${eventData.location ? `
            <div class="detail-row">
              <strong>Location:</strong> ${eventData.location}
            </div>
            ` : ''}
            ${eventData.description ? `
            <div class="detail-row">
              <strong>Details:</strong> ${eventData.description}
            </div>
            ` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">Add to Calendar</a>
          </div>
          
          <p>Don't forget to mark this date on your calendar!</p>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `Appointment: ${eventData.title} on ${new Date(eventData.date).toLocaleDateString()}`, html);
}

// ============================================================================
// SUBSCRIPTION EMAILS
// ============================================================================

async function sendSubscriptionRenewalReminderEmail(toEmail, userName, subscriptionData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Subscription Renewal Reminder</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          
          <div class="warning-box">
            Your <strong>${subscriptionData.tierName}</strong> subscription will renew in <strong>${subscriptionData.daysUntilRenewal} days</strong>.
          </div>
          
          <div class="info-box">
            <div class="detail-row">
              <strong>Plan:</strong> ${subscriptionData.tierName}
            </div>
            <div class="detail-row">
              <strong>Renewal Date:</strong> ${new Date(subscriptionData.renewalDate).toLocaleDateString()}
            </div>
            <div class="detail-row">
              <strong>Amount:</strong> $${parseFloat(subscriptionData.amount).toLocaleString()}/month
            </div>
          </div>
          
          <p>No action is needed if you wish to continue your subscription. Your payment method on file will be charged automatically.</p>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">Manage Subscription</a>
          </div>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, 'Subscription Renewal Reminder', html);
}

// ============================================================================
// ADMIN EMAILS
// ============================================================================

async function sendAdminDailySummaryEmail(toEmail, summaryData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Daily Platform Summary</h1>
          <p>${new Date().toLocaleDateString()}</p>
        </div>
        <div class="content">
          <h3>User Statistics</h3>
          <div class="info-box">
            <div class="detail-row"><strong>New Individual Users:</strong> ${summaryData.newIndividuals || 0}</div>
            <div class="detail-row"><strong>New Law Firms:</strong> ${summaryData.newLawFirms || 0}</div>
            <div class="detail-row"><strong>New Medical Providers:</strong> ${summaryData.newMedicalProviders || 0}</div>
            <div class="detail-row"><strong>Total Active Users:</strong> ${summaryData.totalActiveUsers || 0}</div>
          </div>
          
          <h3>Activity Summary</h3>
          <div class="info-box">
            <div class="detail-row"><strong>Settlements Created:</strong> ${summaryData.settlementsCreated || 0}</div>
            <div class="detail-row"><strong>Disbursements Processed:</strong> ${summaryData.disbursementsProcessed || 0}</div>
            <div class="detail-row"><strong>Total Disbursed:</strong> $${parseFloat(summaryData.totalDisbursed || 0).toLocaleString()}</div>
            <div class="detail-row"><strong>Messages Sent:</strong> ${summaryData.messagesSent || 0}</div>
          </div>
          
          ${summaryData.alerts && summaryData.alerts.length > 0 ? `
          <h3>Alerts</h3>
          <div class="alert-box">
            <ul>
              ${summaryData.alerts.map(alert => `<li>${alert}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}/portal/admin" class="button">View Admin Dashboard</a>
          </div>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `Verdict Path Daily Summary - ${new Date().toLocaleDateString()}`, html);
}

async function sendAdminNewRegistrationEmail(toEmail, userData) {
  const userTypeLabels = {
    'individual': 'Individual User',
    'lawfirm': 'Law Firm',
    'medical_provider': 'Medical Provider'
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New User Registration</h1>
        </div>
        <div class="content">
          <p>A new user has registered on Verdict Path:</p>
          
          <div class="info-box">
            <div class="detail-row">
              <strong>Type:</strong> ${userTypeLabels[userData.userType] || userData.userType}
            </div>
            <div class="detail-row">
              <strong>Name:</strong> ${userData.name}
            </div>
            <div class="detail-row">
              <strong>Email:</strong> ${userData.email}
            </div>
            <div class="detail-row">
              <strong>Registration Date:</strong> ${new Date().toLocaleString()}
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}/portal/admin" class="button">View in Admin Portal</a>
          </div>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `New ${userTypeLabels[userData.userType] || 'User'} Registration`, html);
}

async function sendAdminSecurityAlertEmail(toEmail, alertData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
          <h1>Security Alert</h1>
        </div>
        <div class="content">
          <div class="alert-box">
            <strong>Alert Type:</strong> ${alertData.type}
            <p>${alertData.message}</p>
          </div>
          
          <div class="info-box">
            <div class="detail-row"><strong>Time:</strong> ${new Date().toLocaleString()}</div>
            <div class="detail-row"><strong>User:</strong> ${alertData.userName || 'N/A'}</div>
            <div class="detail-row"><strong>IP Address:</strong> ${alertData.ipAddress || 'N/A'}</div>
            ${alertData.details ? `<div class="detail-row"><strong>Details:</strong> ${alertData.details}</div>` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}/portal/admin" class="button">View Admin Dashboard</a>
          </div>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, `Security Alert: ${alertData.type}`, html);
}

// ============================================================================
// HIPAA AUDIT EMAIL
// ============================================================================

async function sendHIPAAAuditAlertEmail(toEmail, providerName, auditData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HIPAA Compliance Report</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${providerName}</strong>,</p>
          
          <p>Your periodic HIPAA compliance report is available:</p>
          
          <div class="info-box">
            <div class="detail-row">
              <strong>Report Period:</strong> ${auditData.period || 'Monthly'}
            </div>
            <div class="detail-row">
              <strong>Total Access Events:</strong> ${auditData.totalEvents || 0}
            </div>
            <div class="detail-row">
              <strong>Compliance Status:</strong> ${auditData.complianceStatus || 'Compliant'}
            </div>
          </div>
          
          ${auditData.alerts && auditData.alerts.length > 0 ? `
          <div class="warning-box">
            <strong>Attention Required:</strong>
            <ul>
              ${auditData.alerts.map(alert => `<li>${alert}</li>`).join('')}
            </ul>
          </div>
          ` : `
          <div class="success-box">
            No compliance issues detected during this period.
          </div>
          `}
          
          <div style="text-align: center;">
            <a href="${getBaseUrl()}" class="button">View Full Report</a>
          </div>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, 'HIPAA Compliance Report Available', html);
}

// ============================================================================
// NOTIFICATION CC EMAIL
// ============================================================================

async function sendNotificationCCEmail(toEmail, notificationData) {
  const { 
    senderName,
    title, 
    body, 
    type,
    isUrgent = false,
    sentAt
  } = notificationData;

  const urgentPrefix = isUrgent ? '[URGENT] ' : '';
  const subject = `${urgentPrefix}${title} - Verdict Path`;
  
  const formattedDate = sentAt 
    ? new Date(sentAt).toLocaleString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    : new Date().toLocaleString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      });

  const urgentStyle = isUrgent 
    ? 'background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px;' 
    : '';
  
  const urgentBadge = isUrgent 
    ? '<span style="background: #dc3545; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-left: 10px;">URGENT</span>' 
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header" ${isUrgent ? 'style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);"' : ''}>
          <h1>Notification from Verdict Path${urgentBadge}</h1>
        </div>
        <div class="content">
          <div style="border-bottom: 2px solid #ddd; padding-bottom: 15px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>From:</strong> ${senderName} via Verdict Path</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
          </div>
          
          <div style="${urgentStyle || 'background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;'}">
            <h2 style="color: ${isUrgent ? '#721c24' : '#1e3a5f'}; margin-top: 0;">${title}</h2>
            <div style="white-space: pre-wrap; line-height: 1.8; color: #333;">
${body}
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${getBaseUrl()}" class="button">Open in Verdict Path App</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #ddd; font-size: 12px; color: #666;">
            <p>This notification was sent to your email because you enabled email forwarding in your Verdict Path notification settings.</p>
            <p>To manage your notification preferences, visit <strong>Settings > Notifications</strong> in the app.</p>
          </div>
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, subject, html);
}

async function sendPasswordResetEmail(toEmail, resetToken, userType) {
  const baseUrl = getBaseUrl();
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}&type=${userType}`;
  
  const userTypeLabel = {
    individual: 'Individual User',
    lawfirm: 'Law Firm',
    medicalprovider: 'Medical Provider'
  }[userType] || 'User';
  
  const subject = 'Password Reset Request - Verdict Path';
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
          <p>Verdict Path - Legal Case Management</p>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset the password for your <strong>${userTypeLabel}</strong> account.</p>
          
          <div class="warning-box">
            <strong>Important:</strong> This link will expire in 1 hour for security purposes.
          </div>
          
          <p style="text-align: center;">
            <a href="${resetLink}" class="button">Reset My Password</a>
          </p>
          
          <p>Or copy and paste this link into your browser:</p>
          <div class="info-box">
            <code style="word-break: break-all;">${resetLink}</code>
          </div>
          
          <div class="info-blue-box">
            <strong>Didn't request this?</strong><br>
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </div>
          
          ${emailFooter}
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail(toEmail, subject, html);
}

async function sendPasswordResetConfirmationEmail(toEmail, userType) {
  const userTypeLabel = {
    individual: 'Individual User',
    lawfirm: 'Law Firm',
    medicalprovider: 'Medical Provider'
  }[userType] || 'User';
  
  const subject = 'Password Changed Successfully - Verdict Path';
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Changed</h1>
          <p>Verdict Path - Legal Case Management</p>
        </div>
        <div class="content">
          <p>Hello,</p>
          
          <div class="success-box">
            <strong>Success!</strong> Your password has been changed successfully.
          </div>
          
          <p>Your <strong>${userTypeLabel}</strong> account password was just changed. You can now log in with your new password.</p>
          
          <div class="alert-box">
            <strong>Security Alert:</strong> If you did not make this change, please contact support immediately.
          </div>
          
          ${emailFooter}
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail(toEmail, subject, html);
}

module.exports = {
  sendCredentialEmail,
  sendPasswordChangeConfirmation,
  sendWelcomeEmail,
  sendSecurityAlertEmail,
  sendTaskAssignedEmail,
  sendTaskReminderEmail,
  sendTaskCompletedEmail,
  sendSettlementCreatedEmail,
  sendDisbursementProcessedEmail,
  sendLienPaymentEmail,
  sendIOLTADepositConfirmationEmail,
  sendNewMessageEmail,
  sendDocumentUploadedEmail,
  sendConnectionRequestEmail,
  sendConnectionAcceptedEmail,
  sendNegotiationOfferEmail,
  sendNegotiationResponseEmail,
  sendCalendarEventEmail,
  sendSubscriptionRenewalReminderEmail,
  sendAdminDailySummaryEmail,
  sendAdminNewRegistrationEmail,
  sendAdminSecurityAlertEmail,
  sendHIPAAAuditAlertEmail,
  sendNotificationCCEmail,
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail
};
