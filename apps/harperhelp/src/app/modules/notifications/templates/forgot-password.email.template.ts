interface ForgotPasswordTemplateParams {
  fullName: string;
  resetLink: string;
  appUrl: string;
}

export function forgotPasswordTemplate({
  fullName,
  resetLink,
  appUrl,
}: ForgotPasswordTemplateParams): string {
  return `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Reset Password - HarperHelp</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      background: #ebedef;
      font-family: Arial, sans-serif;
    "
  >
    <div style="width: 100%; padding: 40px 0">

      <table
        cellpadding="0"
        cellspacing="0"
        style="width: 640px; margin: auto; background: #ffffff"
      >
        <tr>
          
          <td style="padding: 30px; font-size: 16px; line-height: 26px">
                <img
        src="${appUrl}/images/HarperLogo.png"
        alt="HarperHelp Logo"
        style="display: block;  margin-bottom:24px; width: 200px"
      />
            <h2
              style="
                margin-top: 0;
                font-size: 30px;
                font-weight: 700;
                line-height: 38px;
              "
            >
              Reset Your Password
            </h2>
            <p>Hi ${fullName},</p>
            <p>We received a request to reset your password.</p>
            <p style="margin: 28px 0">
              <a
                style="
                  display: inline-block;
                  background: #000080;
                  color: #fff;
                  text-decoration: none;
                  padding: 14px 28px;
                  border-radius: 24px;
                  font-size: 16px;
                  font-weight: bold;
                "
              >
                Set New Password
              </a>
            </p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, you can ignore this email.</p>
            <p>HarperHelp Team</p>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>

  `;
}
