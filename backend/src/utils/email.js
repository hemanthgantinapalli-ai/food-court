import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to your preferred email service
    auth: {
      user: process.env.EMAIL_USERNAME || 'test@example.com', // Setup in .env
      pass: process.env.EMAIL_PASSWORD || 'password', // Setup in .env
    },
  });

  // Define the email options
  const mailOptions = {
    from: '"FoodCourt" <noreply@foodcourt.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // Actually send the email
  await transporter.sendMail(mailOptions);
};

export default sendEmail;
