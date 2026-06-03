interface AdminInviteTemplateParams {
  fullName: string;
  role: string;
  organizationName: string;
  inviteLink: string;
}

export function adminInviteTemplate({
  fullName,
  role,
  organizationName,
  inviteLink,
}: AdminInviteTemplateParams): string {
  return `
<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8">
  <title>Invitation - HarperHelp</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #ebedef;
      font-family: 'Poppins', sans-serif;
    }

    .container {
      width: 100%;
      padding: 40px 0;
    }

    .card {
      width: 640px;
      margin: auto;
      background: #ffffff;
    }

    .content {
      padding: 30px;
    }

    .button {
      display: inline-block;
      background: #000080;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 30px;
      font-weight: 600;
    }
  </style>
</head>

<body>

  <div class="container">
    <table class="card" cellpadding="0" cellspacing="0">

      <tr>
        <td align="center" style="padding: 20px;">
          <img
            src="https://harperhelp.vercel.app/images/harperhelplogo.png"
            width="220"
            alt="HarperHelp">
        </td>
      </tr>

      <tr>
        <td>
          <img
            src="https://harperhelp.vercel.app/images/invite-banner.png"
            width="100%"
            alt="Banner">
        </td>
      </tr>

      <tr>
        <td class="content">

          <h1>You've been invited</h1>

          <p>Hi ${fullName},</p>

          <p>
            You've been invited to join
            <strong>${organizationName}</strong>
            as
            <strong>${role}</strong>.
          </p>

          <p>
            Click below to accept your invite and set up your account.
          </p>

          <div style="margin:30px 0;">
            <a href="${inviteLink}" class="button">
              Accept Invite
            </a>
          </div>

          <p>
            This invitation will expire in 48 hours.
          </p>

          <p>
            If you weren't expecting this, please disregard this email.
          </p>

          <p>
            HarperHelp Team
          </p>

        </td>
      </tr>

    </table>
  </div>

</body>
</html>
  `;
}
