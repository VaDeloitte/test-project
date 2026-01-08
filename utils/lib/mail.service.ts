import nodemailer from 'nodemailer';
import { EMAIL_FROM, EMAIL_SERVER_PASSWORD } from '../app/const';

export async function sendMail(subject: string, toEmail: string, otpText: string, htmlBody: any) {
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_FROM,
        pass: EMAIL_SERVER_PASSWORD,
      },
    });
  
    var mailOptions = {
      from: EMAIL_FROM,
      to: toEmail,
      subject: `${subject} - ${otpText}`,
      text: otpText,
      html: htmlBody
    };
  
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        throw new Error(error.message);
      } else {
        console.log("Email Sent");
        return true;
      }
    });
  }