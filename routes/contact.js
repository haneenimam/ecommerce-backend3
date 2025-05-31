const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Please fill in all fields.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: 'haneenimam99@gmail.com',
      subject: `New message from ${name}`,
      text: `From: ${name}\nEmail: ${email}\n\n${message}`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent:', info.messageId); // ⬅ أضف دي

    res.status(200).json({ message: 'Message sent successfully.' });

  } catch (error) {
    console.error('Email send error:', error); // ⬅ دي بتطبع الخطأ
    res.status(500).json({ message: 'Failed to send message.' });
  }
});


module.exports = router;