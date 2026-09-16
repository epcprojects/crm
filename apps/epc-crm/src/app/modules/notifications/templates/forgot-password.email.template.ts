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
<!DOCTYPE html>
<html>

<head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">
    <title>EPC CRM</title>
    <meta name="”x-apple-disable-message-reformatting”">
    <meta name="viewport" content="initial-scale=1.0">
    <meta name="format-detection" content="telephone=no">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style type="text/css">
        [style*="Nunito"] {
            font-family: "Nunito", Arial, sans-serif;
        }

        .gmailfix {
            display: none !important;
        }

        .ReadMsgBody {
            width: 100%;
            /* background-color: #ebedef; */
        }

        .ExternalClass {
            width: 100%;
            /* background-color: #ebedef; */
        }

        .border_radious img {
            border-radius: 20px;
        }

        .ExternalClass,
        .ExternalClass p,
        .ExternalClass span,
        .ExternalClass font,
        .ExternalClass td,
        .ExternalClass div {
            line-height: 100%;
        }

        #outlook a {
            padding: 0;
        }

        html {
            width: 100%;
        }

        body {
            background-color: #F3F4F6 !important;
            -webkit-text-size-adjust: none;
            -ms-text-size-adjust: none;
        }

        html,
        body {
            /* background-color: #ebedef; */
            margin: 0;
            padding: 0;
        }

        table {
            border-spacing: 0;
        }

        table td {
            border-collapse: collapse;
        }

        br,
        strong br,
        b br,
        em br,
        i br {
            line-height: 100%;
        }

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
            line-height: 100% !important;
            -webkit-font-smoothing: antialiased;
        }

        img {
            height: auto !important;
            line-height: 100%;
            outline: none;
            text-decoration: none;
            display: block !important;
        }

        .image-140 img {
            max-width: 140px !important;
            width: 140px;
            float: left;
            display: block;
        }

        span a {
            text-decoration: none !important;
        }

        .whitebutton a {
            text-decoration: none;
        }

        table p {
            margin: 0;
        }

        .yshortcuts,
        .yshortcuts a,
        .yshortcuts a:link,
        .yshortcuts a:visited,
        .yshortcuts a:hover,
        .yshortcuts a span {
            text-decoration: none !important;
            border-bottom: none !important;
        }

        table {
            mso-table-lspace: 0;
            mso-table-rspace: 0;
        }

        img {
            -ms-interpolation-mode: bicubic;
        }

        body {
            -webkit-text-size-adjust: 100%;
        }

        body {
            -ms-text-size-adjust: 100%;
        }

        img {
            height: auto !important;
        }

        @media only screen and (max-width: 650px) {
            body {
                width: auto !important;
            }

        }

        @media only screen and (max-width: 650px) {
            td[class=image-100-percent] img {
                width: 100% !important;
                height: auto !important;
                max-width: 100% !important;
            }

        }

        @media only screen and (max-width: 650px) {
            table[class=full-width] {
                width: 100% !important;
            }
        }

        @media only screen and (max-width: 650px) {
            td[class=text-center] {
                text-align: center !important;
            }
        }

        @media only screen and (max-width: 479px) {
            body {
                font-size: 10px !important;
            }
        }

        @media only screen and (max-width: 479px) {
            table[class=container] {
                width: 95% !important;
            }
        }

        @media only screen and (max-width: 479px) {
            td[class=full-width] img {
                width: 100% !important;
                height: auto !important;
                max-width: 100% !important;
                min-width: 124px !important;
            }

        }

        @media only screen and (max-width: 479px) {
            td[class=image-100-percent] img {
                width: 100% !important;
                height: auto !important;
                max-width: 100% !important;
                min-width: 124px !important;
            }

        }

        @media only screen and (max-width: 479px) {
            table[class=full-width] {
                width: 100% !important;
            }

        }

        @media only screen and (max-width: 479px) {
            td[class=text-center] {
                text-align: center !important;
            }

        }

        @media only screen and (max-width: 479px) {
            div[class=text-center] {
                text-align: center !important;
            }

        }

        @media only screen and (max-width: 479px) {
            table[class=fix-box] {
                padding-left: 0 !important;
                padding-right: 0 !important;
            }
        }

        @media only screen and (max-width: 479px) {
            td[class=fix-box] {
                padding-left: 0 !important;
                padding-right: 0 !important;
            }
        }

        @media only screen and (max-width: 479px) {
            [class~=hide_on_mobile] {
                display: none !important;
            }
        }

        @media only screen and (max-width: 520px) {
            table[class=responsive_product] {
                width: 100% !important;
            }
        }

        @media only screen and (max-width: 479px) {
            img[class=image-100-percent] {
                width: 100% !important;
                height: auto !important;
                max-width: 100% !important;
                min-width: 124px !important;
            }
        }

        @media only screen and (max-width: 479px) {
            td[class=menumobile] {
                padding-top: 5px !important;
            }
        }
    </style>

</head>

<body bgcolor="#F3F4F6">
    <table bgcolor="#F3F4F6"  style="
         background-color:#F3F4F6; 
        " width="100%" class="full-width" border="0" align="center" cellpadding="0" cellspacing="0">
        <tbody>
            <tr>
                <td  bgcolor="#F3F4F6" style="padding: 24px; background-color:#F3F4F6;">
                    <table bgcolor="#FFFFFF" style="border-radius: 12px; box-shadow:0 0 12px 0 rgba(0, 0, 0, 0.05);"
                        width="600" align="center" border="0" cellspacing="0" cellpadding="0" class="full-width">
                        <tbody>
                                     <tr>
    <td
        align="left"
        valign="middle"
        style="padding:24px;"
    >
        <table
            role="presentation"
            align="left"
            cellpadding="0"
            cellspacing="0"
            border="0"
        >
            <tr>
                <td
                    align="left"
                    valign="middle"
                    style="
                        padding:0;
                        line-height:0;
                        font-size:0;
                    "
                >
                    <a
                        href=""
                        target="_blank"
                        style="
                            display:inline-block;
                            text-decoration:none;
                        "
                    >
                        <img
                            src="${appUrl}/images/Banners/HarperLogo.png"
                            width="30"
                            alt=""
                            style="
                                display:block;
                                width:30px;
                                height:auto;
                                border:0;
                                outline:none;
                                text-decoration:none;
                            "
                        >
                    </a>
                </td>
                <td
                    width="8"
                    style="
                        width:8px;
                        font-size:0;
                        line-height:0;
                    "
                >
                    &nbsp;
                </td>
                <td
                    align="left"
                    valign="middle"
                    style="
                        padding:0;
                        color:#111827;
                        font-family:'Nunito', Arial, sans-serif;
                        font-size:24px;
                        font-weight:500;
                        white-space:nowrap;
                    "
                >
                    <strong style="font-weight:700; color:#111827;">Harper</strong>HelpDesk
                </td>
            </tr>
        </table>
    </td>
</tr>

                            <tr>
                                <td align="center" valign="top" class="fix-box">
                                    <table bgcolor="#FFFFFF" style="border-radius:12px; " width="600" align="center"
                                        border="0" cellspacing="0" cellpadding="0" class="full-width">
                                        <tbody>
                                            <tr>
                                                <td bgcolor="#FFFFFF">
                                                    <table width="100%" align="center" cellpadding="0" cellspacing="0"
                                                        border="0" style="border-collapse:collapse;">
                                                        <tbody>

                                                            <tr>
                                                                <td bgcolor="#FFFFFF" align="center" valign="top"
                                                                    class="fix-box">
                                                                    <table width="100%" align="center" border="0"
                                                                        cellspacing="0" cellpadding="0"
                                                                        class="full-width">
                                                                        <tbody>
                                                                            <tr>
                                                                                <td style="">
                                                                                    <table width="100%" align="left"
                                                                                        cellpadding="0" cellspacing="0"
                                                                                        border="0"
                                                                                        style="border-collapse:collapse;">
                                                                                        <tbody>
                                                                                            <tr>
                                                                                                <td class="whitebutton text-center"
                                                                                                    width="100%">
                                                                                                    <table width="100%"
                                                                                                        align="center"
                                                                                                        cellspacing="0"
                                                                                                        cellpadding="0"
                                                                                                        border="0">
                                                                                                        <tbody>
                                                                                                            <tr>
                                                                                                                <td align="center"
                                                                                                                    valign="top"
                                                                                                                    style="
             padding: 0px 24px 24px 24px;
            line-height:0;
            font-size:0;
        ">
                                                                                                                    <a href=""
                                                                                                                        target="_blank"
                                                                                                                        style="display:inline-block; text-decoration:none;">
                                                                                                                        <img src="${appUrl}/images/Banners/ResetYourPasswordIcon.png"
                                                                                                                            width="80"
                                                                                                                            alt="EPC CRM"
                                                                                                                            style="
                    
                    width: 80px;
                    max-width:100%;
                    height:auto;
                    border:0;
                    outline:none;
                    text-decoration:none;
                ">
                                                                                                                    </a>
                                                                                                                </td>
                                                                                                            </tr>

                                                                                                            <tr>
                                                                                                                <td class="whitebutton text-center"
                                                                                                                    width="100%"
                                                                                                                    align="center"
                                                                                                                    style="padding:0px 24px 0px 24px;
                   font-family:'Nunito', Arial, sans-serif;
                   font-size:24px;
                   line-height: 120%;
                   font-weight: 700;
                   color:#111827;">
                                                                                                                   Reset Your Password
                                                                                                                </td>
                                                                                                            </tr>
                                                                                                            <tr>
                                                                                                                <td class="whitebutton text-center"
                                                                                                                    width="100%"
                                                                                                                    align="center"
                                                                                                                    style="padding:8px 24px 24px 24px;
                   color: #374151;
                   line-height: 140%;
                  font-family:'Nunito', Arial, sans-serif;
                   font-size:16px;">
                                                                                                                    We received a request to reset your EPC CRM password
                                                                                                                </td>
                                                                                                            </tr>
                                                                                                            

                                                                                                            <tr>
                                                                                                                <td align="center"
                                                                                                                    style="padding-bottom:24px;">
                                                                                                                    <table
                                                                                                                        align="center"
                                                                                                                        cellpadding="0"
                                                                                                                        cellspacing="0"
                                                                                                                        border="0">
                                                                                                                        <tbody>
                                                                                                                            <tr>
                                                                                                                                <td bgcolor="#8833FF"
                                                                                                                                    align="center"
                                                                                                                                    style="padding:10px 24px;
                        
                            background-image:linear-gradient(
                                90deg,
                                 #1175F9 0%,
                                #8833FF 100%
                            );
                            border-radius:8px;
                            color:#FFFFFF;
                            font-family:'Nunito', Arial, sans-serif;
                            font-size:16px;
                            line-height:100%;
                            text-align:center;">

                                                                                                                                    <a href="${resetLink}"
                                                                                                                                        target="_blank"
                                                                                                                                        style="display:inline-block;
                                color:#FFFFFF !important;
                                font-family:'Nunito', Arial, sans-serif;
                                font-size:16px;
                                line-height:100%;
                                text-align:center;
                                text-decoration:none !important;">

                                                                                                                                        <span
                                                                                                                                            style="color:#FFFFFF !important;
                                    text-decoration:none !important;
                                    mso-style-textfill-type:solid;
                                    mso-style-textfill-fill-color:#FFFFFF;
                                    mso-style-textfill-fill-alpha:100%;">
                                                                                                                                           Reset Password
                                                                                                                                        </span>

                                                                                                                                    </a>

                                                                                                                                </td>
                                                                                                                            </tr>
                                                                                                                        </tbody>
                                                                                                                    </table>
                                                                                                                </td>
                                                                                                            </tr>

                                                                                                           
<tr>
                                                                                                                <td class="whitebutton text-center"
                                                                                                                    width="100%"
                                                                                                                    align="center"
                                                                                                                    style="padding:8px 24px 4px 24px;
                   color: #374151;
                   line-height: 140%;
                  font-family:'Nunito', Arial, sans-serif;
                   font-size:16px;">
                                                                                                                  This link will expire in 1 hour. 
                                                                                                                </td>
                                                                                                            </tr>

                                                                                                            <tr>
                                                                                                                <td class="whitebutton text-center"
                                                                                                                    width="100%"
                                                                                                                    align="center"
                                                                                                                    style="padding:0px 24px 24px 24px;
                   color: #374151;
                   line-height: 140%;
                  font-family:'Nunito', Arial, sans-serif;
                   font-size:16px;">
                                                                                                                  If you didn’t request this, you can safely ignore this email. 
                                                                                                                </td>
                                                                                                            </tr>
                                                                                                            


                                                                                                        </tbody>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </tbody>
                                                                                    </table>
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </td>

                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>




                                            <!-- Footer -->
                                            <tr>
                                                <td style="padding:24px 24px 0px 24px;">
                                                    <table role="presentation" width="100%" cellpadding="0"
                                                        cellspacing="0" border="0"
                                                        style="width:100%; border-collapse:collapse;">
                                                        <tr>
                                                            <td height="1" bgcolor="#E5E7EB" style="
                        height:1px;
                        line-height:1px;
                        font-size:0;
                        background-color:#E5E7EB;
                    ">
                                                                &nbsp;
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="left" style="
            padding:24px 24px 24px 24px;
            font-family:'Nunito', Arial, sans-serif;
            font-size:14px;
            line-height:120%;
            font-weight:400;
            border-radius: 12px;
            color:#374151;
        ">
                                                    EPC CRM
                                                    <span style="color:#9CA3AF;">&nbsp;&bull;&nbsp;</span>
                                                    All your tickets. One place.
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>
    </td>
    </tr>
    </tbody>
    </table>
    <div class="gmailfix" style="white-space:nowrap;font:15px courier;line-height:0;">
    </div>
</body>

</html>

  `;
}
