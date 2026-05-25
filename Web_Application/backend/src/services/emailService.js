const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const sendEmail = async (to, subject, context = {}, attachmentPath = null) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "nidhins1807@gmail.com",
        pass: "slhy vpvm jwhx ezif",
      },
    });

    // Read the HTML template
    let html = fs.readFileSync(
      path.join(__dirname, "email_template.html"),
      "utf8"
    );

    // Replace placeholders with actual values
    for (const key in context) {
      const placeholder = new RegExp(`\\[${key}\\]`, "g");
      html = html.replace(placeholder, context[key]);
    }

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
      attachments: attachmentPath
        ? [
            {
              filename: path.basename(attachmentPath),
              path: attachmentPath,
            },
          ]
        : [],
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email!", error);
    throw error;
  }
};

module.exports = { sendEmail };   
