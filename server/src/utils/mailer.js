import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, html, attachments }) => {
  let transporter = null;

  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const isGmail = String(process.env.SMTP_HOST).toLowerCase().includes("gmail");
      const cleanPass = isGmail 
        ? String(process.env.SMTP_PASS).replace(/\s+/g, "") 
        : process.env.SMTP_PASS;

      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: cleanPass,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 30000
      });
    } else {
      // Use Ethereal test account if SMTP is not configured
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    if (transporter) {
      const fromEmail = process.env.SMTP_USER || "onboarding@palamuexpress.com";
      const info = await transporter.sendMail({
        from: `"Palamu Express News Desk" <${fromEmail}>`,
        to,
        subject,
        html,
        attachments,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[Mailer] Transactional email dispatched. Preview URL: ${previewUrl}`);
      }
      return { success: true, previewUrl };
    }
  } catch (err) {
    console.error("[Mailer Error] Failed to send transactional email:", err.message);
    return { success: false, error: err.message };
  }
};
