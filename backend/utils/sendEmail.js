// Email sending utility using Brevo (SendInBlue)
const SibApiV3Sdk = require('@sendinblue/client');

const sendEmail = async (options) => {
    // Configure API key
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const apiKey = apiInstance.authentications['apiKey'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    
    // Create email
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.html;
    sendSmtpEmail.sender = {
        name: process.env.EMAIL_FROM_NAME || 'Game Vui',
        email: process.env.EMAIL_FROM || 'noreply@gamevui.com'
    };
    sendSmtpEmail.to = [{
        email: options.to
    }];
    
    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully:', data);
        return data;
    } catch (error) {
        console.error('Email sending failed:', error);
        throw new Error('Failed to send email');
    }
};

module.exports = sendEmail;