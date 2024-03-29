import nodemailer from 'nodemailer'
import urljoin from 'url-join'

export const sendPasswordResetEmail = (email, resetToken) => {
  // Since we'll need some extra information here we'll redirect to the frontend instead of the backend.
  // We'll provide the frontend with the token to reset (which will be send back to the backend).
  // We could have placed this token in the cookie as well but taht would be cumbersome in some situations
  // where users that click on an e-mail have no control over the browser that will open the link (e.g. ios).
  // Hence they might have requested the reset in chrome and end up in safar when opening the link.
  const resetUrl = urljoin(process.env.FRONTEND_DOMAIN, `accounts/reset?token=${resetToken}`)

  const content = {
    from: process.env.MAILTRAP_EMAIL,
    to: email,
    subject: 'Your password reset request',
    html: `
    <style>
      form   { background-color: #F3F4F8; }
      span   { display:inline-block; border-radius:4px; background-color:#485C80;}
      a      { min-width:196px; border-top:13px solid; border-bottom:13px solid; border-right:24px solid; border-left:24px solid; border-color:#2ea664; border-radius:4px; background-color:#2ea664; color:#ffffff; font-size:18px; line-height:18px; word-break:break-word; display:inline-block; text-align:center; font-weight:900; text-decoration:none !important }
    </style>
    <div> 
      <h1> You have asked a reset request for < my app ></h1>
      <span><a 
        href="${resetUrl}" 
        target="_blank">Reset</a></span>
    </div>
    `
  }

  return sendEmail(content)
}

export const sendAccountVerificationEmail = (email, verifyToken) => {
  // We'll redirect to the backend here
  const confirmUrl = urljoin(process.env.FRONTEND_DOMAIN, '/accounts/verify/', verifyToken)

  const content = {
    from: process.env.MAILTRAP_EMAIL,
    to: email,
    subject: 'Please activate your <app> account',
    html: `
    <style>
      form   { background-color: #F3F4F8; }
      span   { display:inline-block; border-radius:4px; background-color:#485C80;}
      a      { min-width:196px; border-top:13px solid; border-bottom:13px solid; border-right:24px solid; border-left:24px solid; border-color:#2ea664; border-radius:4px; background-color:#2ea664; color:#ffffff; font-size:18px; line-height:18px; word-break:break-word; display:inline-block; text-align:center; font-weight:900; text-decoration:none !important }
    </style>
    <div> 
      <h1> Confirm your < my app > subscription</h1>
      <span><a 
        href="${confirmUrl}" 
        target="_blank">Sign in</a></span>
    </div>
    `
  }

  return sendEmail(content)
}

const sendEmail = mailContent => {
  const environment = process.argv[2]
  // If environment is anything but production we use mailtrap to 'fake' sending e-mails.
  if (environment !== 'prod') {
    sendMailTrapEmail(mailContent)
  } else {
    // In production, use a real e-mail service.
    // There are many options to implement e-mailing, each of them are a bit cumbersome
    // for a local setup since they need to make sure that users don't use their services
    // to send spam e-mails. This is outside of the scope of this article but you have the choice of:
    // Nodemailer (with gmail or anything like that), Mailgun, SparkPost, or Amazon SES, Mandrill, Twilio SendGrid.
    // .... < your implementation > ....
  }
}

const sendMailTrapEmail = mailContent => {
  const transport = nodemailer.createTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
      // https://blog.mailtrap.io/sending-emails-with-nodemailer/
      user: process.env.MAILTRAP_USERNAME,
      pass: process.env.MAILTRAP_PASSWORD
    }
  })

  return transport.sendMail(mailContent).catch(err => {
    console.error(err)
  })
}
