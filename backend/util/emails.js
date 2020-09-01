import nodemailer from 'nodemailer'
import urljoin from 'url-join'

export const sendMailTrapEmail = (email, verifyToken) => {
  const transport = nodemailer.createTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
      // https://blog.mailtrap.io/sending-emails-with-nodemailer/
      user: process.env.MAILTRAP_USERNAME,
      pass: process.env.MAILTRAP_PASSWORD
    }
  })

  const confirmUrl = urljoin(process.env.BACKEND_DOMAIN, 'api', 'accounts/confirm', verifyToken)

  return transport
    .sendMail({
      from: 'faunafwitter@gmail.com',
      to: email,
      subject: 'Please activate your Fwitter account',
      html: `
      <style>
        form   { background-color: #F3F4F8; }
        span   { display:inline-block; border-radius:4px; background-color:#485C80;}
        a      { min-width:196px; border-top:13px solid; border-bottom:13px solid; border-right:24px solid; border-left:24px solid; border-color:#2ea664; border-radius:4px; background-color:#2ea664; color:#ffffff; font-size:18px; line-height:18px; word-break:break-word; display:inline-block; text-align:center; font-weight:900; text-decoration:none !important }
      </style>
      <div> 
        <h1> Confirm your Fwitter subscription</h1>
        <span><a 
          href="${confirmUrl}" 
          target="_blank"
          data-saferedirecturl="https://www.google.com/url?q=${confirmUrl};source=gmail&amp;ust=1590760546124000&amp;usg=AFQjCNGKBmhdstNA4bhVAEPv7mZK9QxMsQ">Sign in</a></span>
      </div>
      `
    })
    .then((error, info) => {
      console.log(error, info)
    })
    .catch(err => {
      console.error(err)
    })
}
