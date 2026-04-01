const axios = require('axios');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const dns = require('dns');

// Force Node.js to use IPv4 over IPv6 globally for hostname resolution
// This fixes 'connect ENETUNREACH' IPv6 routing issues on restrictive networks.
try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {
    console.error("DNS fallback unsupported:", e);
}

const logFile = path.resolve(__dirname, '../../email_debug.log');

const log = (message) => {
    const timestamp = new Date().toISOString();
    try {
        fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
    } catch (e) {
        console.error("Log error:", e.message);
    }
}

// Mailjet API implementation (Uses Port 443 - Works on ANY network)
const sendEmailViaAPI = async ({ to, subject, html }) => {
    const apiKey = process.env.MAILJET_API_KEY;
    const secretKey = process.env.MAILJET_SECRET_KEY;
    const fromEmail = "piyushrajbeg123@gmail.com";

    if (!apiKey || !secretKey) {
        throw new Error('MAILJET_API_KEY or MAILJET_SECRET_KEY is missing in .env file.');
    }

    try {
        console.log(`[EMAIL_SERVICE] Attempting Mailjet API delivery to: ${to} (Port 443)`);
        const response = await axios.post('https://api.mailjet.com/v3.1/send', {
            Messages: [
                {
                    From: {
                        Email: fromEmail,
                        Name: "Campus Parking"
                    },
                    To: [
                        {
                            Email: to
                        }
                    ],
                    Subject: subject,
                    HTMLPart: html
                }
            ]
        }, {
            auth: {
                username: apiKey,
                password: secretKey
            },
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const messageStatus = response.data.Messages[0].Status;
        log(`SUCCESS: Email sent via Mailjet API. Status: ${messageStatus}`);
        console.log(`[EMAIL_SERVICE] Mailjet SUCCESS: ${messageStatus}`);
        return true;
    } catch (error) {
        let errorDetail = error.response ? JSON.stringify(error.response.data) : error.message;

        if (error.response && error.response.status === 401) {
            errorDetail = "Mailjet Error: Invalid API Key or Secret Key.";
        } else if (error.response && error.response.status === 403) {
            errorDetail = "Mailjet Error: Sender email not verified. Please verify piyushrajbeg123@gmail.com in Mailjet.";
        } else if (error.response && error.response.status === 400) {
            errorDetail = `Mailjet Error: Bad request - ${JSON.stringify(error.response.data)}`;
        }

        console.error('[EMAIL_SERVICE_ERROR] Mailjet failure:', errorDetail);
        log(`ERROR: Mailjet failure: ${errorDetail}`);
        throw new Error(errorDetail);
    }
};

const sendInvoiceEmail = async (booking, user, paymentDetails) => {
    const html = `
        <div style="margin: 0; padding: 0; background-color: #f0f2f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 650px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #0f172a 0%, #334155 100%); padding: 40px 30px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 1px; color: #38bdf8;">Campus Parking</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Booking Confirmation & Invoice</p>
                </div>
                <!-- Content -->
                <div style="padding: 40px 40px; color: #334155;">
                    <p style="font-size: 18px; margin-top: 0; color: #1e293b;">Hi <strong>${user.name}</strong>,</p>
                    <p style="font-size: 16px; line-height: 1.6; color: #64748b; margin-bottom: 30px;">
                        Thank you for booking with Campus Parking! Your parking spot has been successfully reserved. Below are the details of your booking and your payment receipt.
                    </p>
                    
                    <!-- Booking Details Card -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                        <h3 style="margin-top: 0; color: #0f172a; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">Booking Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; width: 40%;"><strong>Booking ID / Order ID:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a; text-align: right;">${booking.orderId || booking._id}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>Payment ID:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a; text-align: right;">${paymentDetails?.paymentId || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>Slot details:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a; text-align: right;">Slot ${booking.slot?.slotNumber || 'N/A'} (${booking.slot?.type || 'N/A'})</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>Start Time:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a; text-align: right;">${new Date(booking.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;"><strong>End Time:</strong></td>
                                <td style="padding: 8px 0; color: #0f172a; text-align: right;">${new Date(booking.endTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Payment Summary -->
                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 0; color: #1e3a8a; font-size: 20px;"><strong>Total Amount Paid:</strong></td>
                                <td style="padding: 0; color: #1d4ed8; text-align: right; font-size: 24px; font-weight: bold;">₹${booking.totalAmount}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Instructions -->
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h4 style="margin-top: 0; color: #1e293b; font-size: 18px;">How to enter</h4>
                        <p style="font-size: 15px; line-height: 1.5; color: #64748b; margin-bottom: 15px;">
                            Please present your booking QR code located in the <strong>My Bookings</strong> section of your dashboard upon reaching the parking entrance.
                        </p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 5px 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">This is an automated invoice and confirmation message.</p>
                    <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">If you have any questions, please contact campus support.</p>
                    <p style="margin: 15px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">&copy; ${new Date().getFullYear()} Campus Parking. All rights reserved.</p>
                </div>
            </div>
        </div>
    `;
    return await sendEmailViaNodemailer({ to: user.email, subject: `✅ Parking Confirmed: Space ${booking.slot?.slotNumber || ''} booked successfully`, html });
};

// Nodemailer configuration for Auth Emails (OTP & Password Reset & Invoices)
const createTransporter = () => {
    // Determine user, pass from env
    const user = process.env.AUTH_EMAIL_USER?.trim() || 'campusparking.cgc@gmail.com';
    const pass = process.env.AUTH_EMAIL_PASS?.trim() || '';

    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // TLS requires secure: false for port 587
        requireTLS: true,
        auth: {
            user: user,
            pass: pass,
        },
        tls: {
            rejectUnauthorized: false
        },
        family: 4 // IPv4 preference
    });
};

const sendEmailViaNodemailer = async ({ to, subject, html }) => {
    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail({
            from: process.env.AUTH_EMAIL_FROM || "no-reply@campusparking.com",
            to,
            subject,
            html,
        });
        log(`SUCCESS: Email sent via Nodemailer. MessageId: ${info.messageId}`);
        console.log(`[EMAIL_SERVICE] Nodemailer SUCCESS: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('[EMAIL_SERVICE_ERROR] Nodemailer failure:', error.message);
        log(`ERROR: Nodemailer failure: ${error.message}`);
        throw new Error(error.message);
    }
};

const sendOTPEmail = async (email, otp) => {
    const html = `
        <div style="margin: 0; padding: 0; background-color: #f0f2f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 20px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">Campus Parking</h1>
                </div>
                <!-- Content -->
                <div style="padding: 40px 30px; text-align: center; color: #334155;">
                    <h2 style="margin-top: 0; color: #1e293b; font-size: 24px; font-weight: 600;">Verify Your Email</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #64748b; margin-bottom: 30px;">
                        You recently requested to authenticate with your email. Please use the verification code below to complete the process. This code is valid for <span style="color: #4f46e5; font-weight: 600;">5 minutes</span>.
                    </p>
                    <div style="background: rgba(79, 70, 229, 0.05); border: 2px dashed #4f46e5; border-radius: 12px; padding: 25px; margin: 0 auto 30px; max-width: 300px;">
                        <p style="font-size: 42px; font-weight: 700; color: #4f46e5; letter-spacing: 12px; margin: 0; text-shadow: 2px 2px 4px rgba(79, 70, 229, 0.1);">${otp}</p>
                    </div>
                    <p style="font-size: 14px; margin-bottom: 0; color: #64748b;">If you didn't request this code, you can safely ignore this email.</p>
                </div>
                <!-- Footer -->
                <div style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 5px 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">This is an automated message from the Campus Parking System.</p>
                    <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">&copy; ${new Date().getFullYear()} Campus Parking. All rights reserved.</p>
                </div>
            </div>
        </div>
    `;
    return await sendEmailViaNodemailer({ to: email, subject: '🔑 Campus Parking - Verification Code', html });
};

const sendResetPasswordEmail = async (email, link) => {
    const html = `
        <div style="margin: 0; padding: 0; background-color: #f0f2f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 40px 20px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">Campus Parking</h1>
                </div>
                <!-- Content -->
                <div style="padding: 40px 30px; text-align: center; color: #334155;">
                    <h2 style="margin-top: 0; color: #1e293b; font-size: 24px; font-weight: 600;">Password Reset Request</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #64748b; margin-bottom: 35px;">
                        We received a request to reset your password for your Campus Parking account. Click the button below to securely set up a new password.
                    </p>
                    <a href="${link}" style="display: inline-block; background: #ef4444; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 8px 15px rgba(239, 68, 68, 0.25);">
                        Reset My Password
                    </a>
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-top: 35px; border-radius: 0 8px 8px 0; text-align: left;">
                        <p style="margin: 0; font-size: 13px; color: #991b1b;">
                            <strong>Note:</strong> If you did not make this request, your account is safe. You can safely ignore this email and your password will remain unchanged.
                        </p>
                    </div>
                </div>
                <!-- Footer -->
                <div style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 5px 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">This is an automated security message from the Campus Parking System.</p>
                    <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">&copy; ${new Date().getFullYear()} Campus Parking. All rights reserved.</p>
                </div>
            </div>
        </div>
    `;
    return await sendEmailViaNodemailer({ to: email, subject: '🔒 Campus Parking - Reset Your Password', html });
};

module.exports = { sendInvoiceEmail, sendOTPEmail, sendResetPasswordEmail };
