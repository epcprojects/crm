import {
  ProjectCreatedPayload,
  TicketCreatedPayload,
  TicketReplyPostedPayload,
  TicketStatusUpdatedPayload,
  TicketPriorityUpdatedPayload,
  TicketAssigneeUpdatedPayload,
  TicketAttachmentAddedPayload,
  ProjectAssignedPayload,
  ThreadMessageCreatedPayload,
  ProjectUnassignedPayload,
  ThreadReplyCreatedPayload,
  // EmailAttachmentLink,
} from '../notifications.types';

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#F59E0B',
  low: '#10B981',
};

const STATUS_COLOR: Record<string, string> = {
  open: '#3B82F6',
  in_progress: '#4F46E5',
  resolved: '#10B981',
  closed: '#6B7280',
  on_hold: '#F59E0B',
};

const EXTENSION_ICON_MAP: Record<string, string> = {
  jpg: 'JpgIcon',
  jpeg: 'JpgIcon',
  png: 'PngIcon',
  svg: 'SvgIcon',
  webp: 'WebpIcon',
  doc: 'DocIcon',
  docx: 'DocxIcon',
  xls: 'XlsIcon',
  xlsx: 'XlsxIcon',
  csv: 'CsvIcon',
  pdf: 'PdfIcon',
  txt: 'TxtIcon',
  mp4: 'Mp4Icon',
  mp3: 'Mp3Icon',
  mov: 'MovIcon',
  fig: 'FigIcon',
  html: 'HtmlIcon',
  zip: 'ZipIcon',
};
const DEFAULT_ICON = 'TxtIcon';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'svg', 'webp']);

function isPreviewableImage(extension: string): boolean {
  return IMAGE_EXTENSIONS.has(extension.toLowerCase());
}

function getIconFileName(extension: string): string {
  const key = extension.toLowerCase();
  return `${EXTENSION_ICON_MAP[key] ?? DEFAULT_ICON}.png`;
}

const FONT = "'Nunito', Arial, sans-serif";
const MAX_ROW_VALUE_LEN = 200;
const ICON_PATH = '/images/Banners/'; // fixed — builders pass only the filename
const ATTACHMENT_ICON_PATH = '/images/attachmentsIcons/'; // fixed — builders pass only the filename

// PASTE YOUR COPIED <style>...</style> INNER CONTENT HERE (just the CSS rules,
// not the <style> tags themselves — those are added by shell() below).
const NOTIFICATION_STYLE_BLOCK = `
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
`;
// ---------- status pill colors (my picks for status values beyond your example — override if you want different) ----------

// ---------- status & priority colors (hardcoded from DB — update here if the DB values change) ----------

function normalizeKey(v: string): string {
  return v.toLowerCase().replace(/[\s_-]/g, '');
}

const STATUS_COLOR_HEX: Record<string, string> = {
  planning: '#F79009',
  inprogress: '#D444F1',
  underreview: '#875BF7',
  open: '#F04438',
  resolved: '#17B26A',
  closed: '#667085',
};

const STATUS_LABEL: Record<string, string> = {
  planning: 'Planning',
  inprogress: 'In Progress',
  underreview: 'Under Review',
  open: 'Open',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_COLOR_HEX: Record<string, string> = {
  critical: '#F04438',
  high: '#F79009',
  medium: '#0BA5EC',
  low: '#17B26A',
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const DEFAULT_COLOR_HEX = '#667085'; // gray — used when a status/priority value isn't recognized

function pillColorsFromHex(hex: string): {
  border: string;
  bg: string;
  text: string;
} {
  return {
    border: `${hex}4D`, // ~30% opacity
    bg: `${hex}1F`, // ~12% opacity
    text: hex, // full opacity
  };
}

function getStatusPillColors(status: string): {
  border: string;
  bg: string;
  text: string;
} {
  return pillColorsFromHex(
    STATUS_COLOR_HEX[normalizeKey(status)] ?? DEFAULT_COLOR_HEX,
  );
}

function getPriorityPillColors(priority: string): {
  border: string;
  bg: string;
  text: string;
} {
  return pillColorsFromHex(
    PRIORITY_COLOR_HEX[normalizeKey(priority)] ?? DEFAULT_COLOR_HEX,
  );
}

function getStatusLabel(status: string): string {
  return STATUS_LABEL[normalizeKey(status)] ?? status;
}

function getPriorityLabel(priority: string): string {
  return PRIORITY_LABEL[normalizeKey(priority)] ?? priority;
}

function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface DataRow {
  label: string;
  value: string;
  badgeColor?: string;
  compound?: {
    prefix: string;
    badgeText: string;
    colors: { border: string; bg: string; text: string };
  };
  dot?: {
    color: string;
    text: string;
  };
}

interface NotificationEmailParams {
  appUrl: string;
  iconFileName: string; // e.g. "NewReplyOnTicketIcon.png" — path is prepended automatically
  title: string;
  subheading: string;
  rows: DataRow[];
  buttonText: string;
  buttonUrl: string;
  showReplyCallout?: boolean;
  internalNote?: boolean; // default false
  // attachments?: EmailAttachmentLink[]; // optional list of attachments to show in the email
}

// ---------- helpers ----------

function escapeHtml(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(value: string, max = MAX_ROW_VALUE_LEN): string {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
function truncateSubject(value: string, max = 80): string {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function truncateFileName(value: string, max = 50): string {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function iconUrl(appUrl: string, fileName: string): string {
  return `${appUrl}${ICON_PATH}${fileName}`;
}

function attachmentIconUrl(appUrl: string, fileName: string): string {
  return `${appUrl}${ATTACHMENT_ICON_PATH}${fileName}`;
}

// ---------- shell (exact structure from your file) ----------

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>

<head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">
    <title>${escapeHtml(title)}</title>
    <meta name="x-apple-disable-message-reformatting">
    <meta name="viewport" content="initial-scale=1.0">
    <meta name="format-detection" content="telephone=no">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style type="text/css">
${NOTIFICATION_STYLE_BLOCK}
    </style>

</head>

<body bgcolor="#F3F4F6">
    <table  bgcolor="#F3F4F6"  style="
         background-color:#F3F4F6; 
        " width="100%" class="full-width" border="0" align="center" cellpadding="0" cellspacing="0">
        <tbody>
            <tr>
                <td bgcolor="#F3F4F6" style="padding: 24px; background-color:#F3F4F6;">
                    <table bgcolor="#FFFFFF" style="border-radius: 12px; box-shadow:0 0 12px 0 rgba(0, 0, 0, 0.05);"
                        width="600" align="center" border="0" cellspacing="0" cellpadding="0" class="full-width">
                        <tbody>
${body}
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>
    <div class="gmailfix" style="white-space:nowrap;font:15px courier;line-height:0;">
    </div>
</body>

</html>`;
}

// ---------- brand header (top logo — kept without a link, per your earlier answer) ----------

function brandHeaderHtml(): string {
  return `
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
                    <img
                        src="${'${LOGO_URL}'}"
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
</tr>`;
}

// ---------- data table rows (variable-length) ----------

function dataRowHtml(row: DataRow, isFirst: boolean): string {
  const topPad = isFirst ? '16px' : '0px';

  let valueCell: string;

  if (row.compound) {
    const { prefix, badgeText, colors } = row.compound;
    valueCell = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td valign="middle" style="padding:0 6px 0 0;font-family:'Nunito', Arial, sans-serif;font-size:14px;line-height:120%;font-weight:500;color:#111827;white-space:nowrap;">
                ${escapeHtml(prefix)}
            </td>
            <td valign="middle">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                    style="border:1px solid ${colors.border};border-radius:100px;border-collapse:separate;background-color:${colors.bg};">
                    <tr>
                        <td valign="middle" style="padding:2px 8px;font-family:'Nunito', Arial, sans-serif;font-size:12px;line-height:18px;font-weight:400;color:${colors.text};white-space:nowrap;">
                            ${escapeHtml(badgeText)}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>`;
  } else if (row.dot) {
    valueCell = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
        style="border:1px solid #E5E7EB;border-radius:6px;border-collapse:separate;background-color:#FFFFFF;">
        <tr>
            <td align="center" valign="middle" style="padding:2px 0 2px 6px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td width="6" height="6" bgcolor="${row.dot.color}"
                            style="width:6px;height:6px;background-color:${row.dot.color};border-radius:50%;font-size:0;line-height:0;"></td>
                    </tr>
                </table>
            </td>
            <td style="padding:2px 6px;font-family:'Nunito', Arial, sans-serif;font-size:14px;line-height:18px;font-weight:600;color:#111827;white-space:nowrap;">
                ${escapeHtml(row.dot.text)}
            </td>
        </tr>
    </table>`;
  } else if (row.badgeColor) {
    valueCell = `<span style="display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;background-color:${row.badgeColor}20;color:${row.badgeColor};">${escapeHtml(truncate(row.value))}</span>`;
  } else {
    valueCell = escapeHtml(truncate(row.value));
  }

  const valueCellPadding = row.compound
    ? '0 16px 16px 16px'
    : `${topPad} 16px 16px 16px`;

  return `
                                                                                                                            <tr>
                                                                                                                                <td width="40%"
                                                                                                                                    align="left"
                                                                                                                                    valign="middle"
                                                                                                                                    style="
                            padding:${topPad} 16px 16px 16px;
                            font-family:'Nunito', Arial, sans-serif;
                            font-size:14px;
                            line-height:120%;
                            font-weight: 400;
                            color:#374151;
                        ">
                                                                                                                                    ${escapeHtml(row.label)}
                                                                                                                                </td>

                                                                                                                                <td width="60%"
                                                                                                                                    align="left"
                                                                                                                                    valign="middle"
                                                                                                                                    style="padding:${valueCellPadding};">
                                                                                                                                    ${valueCell}
                                                                                                                                </td>
                                                                                                                            </tr>`;
}

// --------- attachments Button ---------------------------

function attachmentsBlockHtml(
  appUrl: string,
  attachments?: EmailAttachmentLink[],
): string {
  if (!attachments?.length) return '';

  const inner =
    attachments.length === 1
      ? singleAttachmentHtml(appUrl, attachments[0])
      : multiAttachmentsHtml(appUrl, attachments);

  return `
    <tr>
        <td align="center" style="padding:8px 24px 16px 24px;">
${inner}
        </td>
    </tr>`;
}
// ---------- full notification body (exact nesting preserved) ----------

function singleAttachmentHtml(
  appUrl: string,
  att: EmailAttachmentLink,
): string {
  const isImage = isPreviewableImage(att.extension);
  const iconUrlStr = attachmentIconUrl(appUrl, getIconFileName(att.extension));
  const downloadIconUrlStr = attachmentIconUrl(appUrl, 'NewDownloadIcon.png');

  const topSection = isImage
    ? `
    <tr>
        <td style="padding:0;line-height:0;font-size:0;">
            <a href="${escapeHtml(att.viewUrl)}" target="_blank" style="display:block;text-decoration:none;">
                <img src="${escapeHtml(att.viewUrl)}" width="250" height="200" alt="Attachment preview"
                    style="display:block;width:250px;height:200px;max-height:200px;max-width:100%;margin:0;border:0;outline:none;text-decoration:none;">
            </a>
        </td>
    </tr>`
    : `
    <tr>
        <td align="center" valign="middle" style="padding:34px 16px 36px 16px;line-height:0;font-size:0;">
            <a href="${escapeHtml(att.viewUrl)}" target="_blank" style="display:inline-block;text-decoration:none;">
                <img src="${iconUrlStr}" width="40" alt="${escapeHtml(att.extension)} file"
                    style="display:block;width:40px;max-width:40px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;">
            </a>
        </td>
    </tr>`;

  const nameAlign = isImage ? 'left' : 'center';
  const smallIconCell = isImage
    ? `
        <td width="32" align="center" valign="middle" style="width:32px;padding:8px 0 8px 3px;line-height:0;font-size:0;">
            <img src="${iconUrlStr}" width="24" height="24" alt="${escapeHtml(att.extension)}"
                style="display:block;width:24px;height:24px;border:0;outline:none;">
        </td>`
    : '';

  const sizeSpan = att.sizeLabel
    ? `<span style="display:block;padding-top:2px;color:#6B7280;font-family:'Nunito', Arial, sans-serif;font-size:10px;line-height:16px;font-weight:400;">${escapeHtml(att.sizeLabel)}</span>`
    : '';

  return `
<table role="presentation" width="250" align="center" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF"
    style="width:250px;max-width:250px;background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;border-collapse:separate;">
    <tbody>
${topSection}
        <tr>
            <td align="left" bgcolor="#F9FAFB" style="padding:8px 10px;background-color:#F9FAFB;border-radius:0 0 8px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;table-layout:fixed;border-collapse:collapse;">
                    <tr>
${smallIconCell}
                        <td align="${nameAlign}" valign="middle" width="154"
                            style="width:154px;max-width:154px;overflow:hidden;font-family:'Nunito', Arial, sans-serif;">
                            <a href="${escapeHtml(att.viewUrl)}" target="_blank"
                                style="display:block;width:154px;max-width:154px;overflow:hidden;color:#111827;font-family:'Nunito', Arial, sans-serif;font-size:12px;line-height:18px;font-weight:500;white-space:nowrap;text-overflow:ellipsis;text-decoration:none;text-align:${nameAlign};">
                                ${escapeHtml(truncateFileName(att.filename, 26))}
                            </a>
                            ${sizeSpan}
                        </td>
                        <td width="24" style="width:24px;padding:0;line-height:0;font-size:0;">
                            <a href="${escapeHtml(att.downloadUrl)}" target="_blank" style="display:block;width:24px;height:24px;text-decoration:none;">
                                <img src="${downloadIconUrlStr}" width="16" height="16" alt="Download"
                                    style="display:block;width:16px;height:16px;border:0;outline:none;">
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </tbody>
</table>`;
}

function multiAttachmentCellHtml(
  appUrl: string,
  att: EmailAttachmentLink,
): string {
  const isImage = isPreviewableImage(att.extension);
  const iconSrc = isImage
    ? att.viewUrl
    : attachmentIconUrl(appUrl, getIconFileName(att.extension));
  const downloadIconUrlStr = attachmentIconUrl(appUrl, 'NewDownloadIcon.png');
  const sizeSpan = att.sizeLabel
    ? `<span style="display:block;padding-top:2px;color:#6B7280;font-family:'Nunito', Arial, sans-serif;font-size:10px;line-height:14px;font-weight:400;">${escapeHtml(att.sizeLabel)}</span>`
    : '';

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F9FAFB"
    style="width:100%;table-layout:fixed;background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;border-collapse:separate;">
    <tr>
        <td width="32" align="center" valign="middle" style="width:32px;padding:8px 0 8px 3px;line-height:0;font-size:0;">
            <img src="${iconSrc}" width="24" height="24" alt="${escapeHtml(att.extension)}"
                style="display:block;width:24px;height:24px;border:0;outline:none;">
        </td>
        <td align="left" valign="middle" width="100%"
            style="width:100%;min-width:0;max-width:0;padding:5px 4px 5px 0;overflow:hidden;font-family:'Nunito', Arial, sans-serif;">
            <a href="${escapeHtml(att.viewUrl)}" target="_blank"
                style="display:block;width:100%;max-width:100%;overflow:hidden;color:#111827;font-family:'Nunito', Arial, sans-serif;font-size:12px;line-height:12px;font-weight:400;white-space:nowrap;text-overflow:ellipsis;text-decoration:none;">
                ${escapeHtml(truncateFileName(att.filename, 26))}
            </a>
            ${sizeSpan}
        </td>
        <td width="20" align="center" valign="middle" style="width:20px;padding:0 5px 0 0;line-height:0;font-size:0;">
            <a href="${escapeHtml(att.downloadUrl)}" target="_blank" style="display:block;width:24px;height:24px;text-decoration:none;">
                <img src="${downloadIconUrlStr}" width="16" height="16" alt="Download" style="display:block;width:16px;height:16px;margin:4px auto;border:0;outline:none;">
            </a>
        </td>
    </tr>
</table>`;
}

function multiAttachmentsHtml(
  appUrl: string,
  attachments: EmailAttachmentLink[],
): string {
  const rows: string[] = [];

  for (let i = 0; i < attachments.length; i += 2) {
    const left = attachments[i];
    const right = attachments[i + 1];

    const rightCellHtml = right
      ? `
        <td width="12" style="width:12px;font-size:0;line-height:0;padding-bottom:8px;">&nbsp;</td>
        <td width="50%" valign="top" style="padding-bottom:8px;">
            ${multiAttachmentCellHtml(appUrl, right)}
        </td>`
      : `
        <td width="12" style="width:12px;font-size:0;line-height:0;padding-bottom:8px;">&nbsp;</td>
        <td width="50%" style="padding-bottom:8px;">&nbsp;</td>`;

    rows.push(`
    <tr>
        <td width="50%" valign="top" style="padding-bottom:8px;">
            ${multiAttachmentCellHtml(appUrl, left)}
        </td>${rightCellHtml}
    </tr>`);
  }

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;table-layout:fixed;border-collapse:collapse;">
${rows.join('')}
</table>`;
}

export function renderNotificationEmail(
  params: NotificationEmailParams,
): string {
  const {
    appUrl,
    iconFileName,
    title,
    subheading,
    rows,
    buttonText,
    buttonUrl,
    showReplyCallout = false,
    internalNote = false,
    // attachments = [],
  } = params;

  const logoUrl = iconUrl(appUrl, 'HarperLogo.png');
  const bannerIconUrl = iconUrl(appUrl, iconFileName);
  const notificationIconUrl = iconUrl(appUrl, 'EmailNotificationIcon.png');

  const internalNoteHtml = internalNote ? internalNoteBannerHtml() : '';
  // const attachmentsHtml = attachmentsBlockHtml(appUrl, attachments);

  const rowsHtml = rows.map((r, i) => dataRowHtml(r, i === 0)).join('');

  const replyCalloutHtml = showReplyCallout
    ? `
                                                                                                            <tr>
                                                                                                                <td align="center"
                                                                                                                    style="padding:8px 24px 16px 24px;">
                                                                                                                    <table
                                                                                                                        role="presentation"
                                                                                                                        width="100%"
                                                                                                                        cellpadding="0"
                                                                                                                        cellspacing="0"
                                                                                                                        border="0"
                                                                                                                        bgcolor="#FAF5FF"
                                                                                                                        style="
                                                                                                                                  width:100%;
                                                                                                                                  background-color:#FAF5FF;
                                                                                                                                  border-radius:8px;
                                                                                                                                  border-collapse:separate;
                                                                                                                              ">
                                                                                                                        <tr>
                                                                                                                            <td width="40"
                                                                                                                                align="center"
                                                                                                                                valign="middle"
                                                                                                                                style="padding:10px 0 10px 10px;">
                                                                                                                                <img src="${notificationIconUrl}"
                                                                                                                                    width="36"
                                                                                                                                    alt=""
                                                                                                                                    style="
                            display:block;
                            width:36px;
                            max-width:36px;
                            height:auto;
                            margin:0 auto;
                            border:0;
                            outline:none;
                            text-decoration:none;
                        ">
                                                                                                                            </td>

                                                                                                                            <td align="left"
                                                                                                                                valign="middle"
                                                                                                                                style="
                        padding:10px 12px;
                        font-family:'Nunito', Arial, sans-serif;
                        color:#111827;
                    ">
                                                                                                                                

                                                                                                                                <span
                                                                                                                                    style="
                            display:block;
                            font-family:'Nunito', Arial, sans-serif;
                            font-size:14px;
                            line-height:14px;
                            font-weight:400;
                            color:#374151;
                        ">
                                                                                                                                    Open this ticket in HarperHelpDesk to view the complete discussion and latest updates.

                                                                                                                                </span>
                                                                                                                            </td>
                                                                                                                        </tr>
                                                                                                                    </table>
                                                                                                                </td>
                                                                                                            </tr>`
    : '';

  function internalNoteBannerHtml(): string {
    return `
                                                                                                            <tr>
                                                                                                                <td align="center"
                                                                                                                    style="padding:0px 24px 16px 24px;">
                                                                                                                    <table
                                                                                                                        role="presentation"
                                                                                                                        width="100%"
                                                                                                                        cellpadding="0"
                                                                                                                        cellspacing="0"
                                                                                                                        border="0"
                                                                                                                        bgcolor="#FEF3C7"
                                                                                                                        style="
                width:100%;
                background-color:#FEF3C7;
                border:1px solid #FDE68A;
                border-radius:8px;
                border-collapse:separate;
            ">
                                                                                                                        <tr>
                                                                                                                            <td align="left"
                                                                                                                                valign="middle"
                                                                                                                                style="
                        padding:10px 12px;
                        font-family:'Nunito', Arial, sans-serif;
                        font-size:13px;
                        line-height:140%;
                        font-weight:600;
                        color:#92400E;
                    ">
                                                                                                                                🔒 Internal Note — visible to team members only
                                                                                                                            </td>
                                                                                                                        </tr>
                                                                                                                    </table>
                                                                                                                </td>
                                                                                                            </tr>`;
  }
  const body = `
${brandHeaderHtml()}

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
                                                                                                                    <img src="${bannerIconUrl}"
                                                                                                                        width="80"
                                                                                                                        alt="Harper Help Desk"
                                                                                                                        style="
                    
                    width: 80px;
                    max-width:100%;
                    height:auto;
                    border:0;
                    outline:none;
                    text-decoration:none;
                ">
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
                                                                                                                    ${escapeHtml(title)}
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
                                                                                                                    ${escapeHtml(subheading)}
                                                                                                                </td>
                                                                                                            </tr>
                                                                                                            <tr>
                                                                                                                <td align="center"
                                                                                                                    style="padding:0px 24px 20px 24px;">

                                                                                                                    <table
                                                                                                                        role="presentation"
                                                                                                                        width="100%"
                                                                                                                        align="center"
                                                                                                                        cellpadding="0"
                                                                                                                        cellspacing="0"
                                                                                                                        border="0"
                                                                                                                        style="
                width:100%;
                max-width:552px;
                border:1px solid #E5E7EB;
                border-radius:12px;
                border-collapse:separate;
                background-color:#FFFFFF;
            ">
                                                                                                                        <tbody>
${rowsHtml}
                                                                                                                        </tbody>
                                                                                                                    </table>

                                                                                                                </td>
                                                                                                            </tr>
                                                                                                           
${internalNoteHtml}
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

                                                                                                                                    <a href="${escapeHtml(buttonUrl)}"
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
                                                                                                                                            ${escapeHtml(buttonText)}
                                                                                                                                        </span>

                                                                                                                                    </a>

                                                                                                                                </td>
                                                                                                                            </tr>
                                                                                                                        </tbody>
                                                                                                                    </table>
                                                                                                                </td>
                                                                                                            </tr>
${replyCalloutHtml}
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
                                                    HarperHelpDesk
                                                    <span style="color:#9CA3AF;">&nbsp;&bull;&nbsp;</span>
                                                    All your tickets. One place.
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>`.replace('${LOGO_URL}', logoUrl); // brandHeaderHtml() is inlined above with the LOGO_URL placeholder

  return shell(title, body);
}

export function buildTicketReplyEmail(
  p: TicketReplyPostedPayload,
  appUrl: string,
): { subject: string; html: string } {
  const rows: DataRow[] = [
    { label: 'Ticket', value: `${p.ticketNumber} - ${p.ticketTitle}` },
    { label: 'Project', value: p.projectName },
    { label: 'Replied by', value: p.postedBy.name },
    { label: 'Preview', value: p.replyContent ?? '' },
  ];

  const html = renderNotificationEmail({
    appUrl,
    iconFileName: 'NewReplyOnTicketIcon.png',
    title: p.isInternal ? 'New Internal Note' : 'New Reply on Ticket',
    subheading: p.isInternal
      ? 'A new internal note has been added to a ticket.'
      : "A new reply has been added to a ticket you're following.",
    rows,
    buttonText: 'View Ticket',
    buttonUrl: `${appUrl}/tickets/${p.ticketId}?projectId=${p.projectId}`,
    showReplyCallout: !p.isInternal, // "reply by email" doesn't make sense for internal-only notes
    // attachments: p.attachments, // NEW
    internalNote: p.isInternal,
  });

  return {
    subject: p.isInternal
      ? `[Internal] Message: [${p.ticketNumber}] `
      : `New Reply: [${p.ticketNumber}] `,
    html,
  };
}

export function buildProjectCreatedEmail(
  p: ProjectCreatedPayload,
  appUrl: string,
): { subject: string; html: string } {
  const rows: DataRow[] = [
    { label: 'Project', value: `${p.projectCode} - ${p.projectName}` },
    { label: 'Created by', value: p.createdBy.name },
    // ...(p.description ? [{ label: 'Description', value: p.description }] : []),
    {
      label: 'Team',
      value: `${p.members.length} member${p.members.length === 1 ? '' : 's'}`,
    },
  ];

  const html = renderNotificationEmail({
    appUrl,
    iconFileName: 'ProjectAssignedIcon.png',
    title: 'New Project Created',
    subheading: `${p.createdBy.name} created a new project you're part of.`,
    rows,
    buttonText: 'View Project',
    buttonUrl: `${appUrl}/projects`,
    showReplyCallout: false,
    // attachments: p.attachments, // NEW
  });

  return {
    subject: `[${p.projectCode}] Project "${truncateSubject(p.projectName)}" has been created`,
    html,
  };
}

export function buildTicketCreatedEmail(
  p: TicketCreatedPayload,
  appUrl: string,
): { subject: string; html: string } {
  const rows: DataRow[] = [
    { label: 'Ticket', value: `${p.ticketNumber} - ${p.title}` },
    { label: 'Project', value: p.projectName },
    {
      label: 'Status',
      value: p.status,
      badgeColor: STATUS_COLOR[p.status.toLowerCase()] ?? '#6B7280',
    },
    ...(p.priority
      ? [
          {
            label: 'Priority',
            value: p.priority,
            badgeColor: PRIORITY_COLOR[p.priority.toLowerCase()] ?? '#6B7280',
          },
        ]
      : []),
    { label: 'Created by', value: p.createdBy.name },
    // ...(p.assignee ? [{ label: 'Assigned to', value: p.assignee.name }] : []),
    ...(p.description
      ? [{ label: 'Description', value: htmlToText(p.description) }]
      : []),
  ];

  const html = renderNotificationEmail({
    appUrl,
    iconFileName: 'TicketCreatedIcon.png',
    title: 'New Ticket Created',
    subheading: `${p.createdBy.name} opened a new ticket on ${p.projectName}.`,
    rows,
    buttonText: 'View Ticket',
    buttonUrl: `${appUrl}/tickets/${p.ticketId}?projectId=${p.projectId}`,
    showReplyCallout: false,
    // attachments: p.attachments, // NEW
  });

  return {
    subject: `[${p.ticketNumber}] New ticket: ${truncateSubject(p.title)}`,
    html,
  };
}

export function buildStatusUpdatedEmail(
  p: TicketStatusUpdatedPayload,
  appUrl: string,
): { subject: string; html: string } {
  const rows: DataRow[] = [
    { label: 'Ticket', value: `${p.ticketNumber} - ${p.ticketTitle}` },
    { label: 'Project', value: p.projectName },
    { label: 'Updated by', value: p.updatedBy.name },
    {
      label: 'Update',
      value: '',
      compound: {
        prefix: 'Status changed to',
        badgeText: getStatusLabel(p.newStatus),
        colors: getStatusPillColors(p.newStatus),
      },
    },
  ];

  const html = renderNotificationEmail({
    appUrl,
    iconFileName: 'TicketUpdatedIcon.png',
    title: 'Ticket Updated',
    subheading: `Ticket ${p.ticketNumber} has been updated.`,
    rows,
    buttonText: 'View Ticket',
    buttonUrl: `${appUrl}/tickets/${p.ticketId}?projectId=${p.projectId}`,
    showReplyCallout: false,
  });

  return {
    subject: `[${p.ticketNumber}] Status changed to ${p.newStatus}`,
    html,
  };
}

export function buildPriorityUpdatedEmail(
  p: TicketPriorityUpdatedPayload,
  appUrl: string,
): { subject: string; html: string } {
  const rows: DataRow[] = [
    { label: 'Ticket', value: `${p.ticketNumber} - ${p.ticketTitle}` },
    { label: 'Project', value: p.projectName },
    { label: 'Updated by', value: p.updatedBy.name },
    {
      label: 'Update',
      value: '',
      compound: {
        prefix: 'Priority changed to',
        badgeText: getPriorityLabel(p.newPriority),
        colors: getPriorityPillColors(p.newPriority),
      },
    },
  ];

  const html = renderNotificationEmail({
    appUrl,
    iconFileName: 'TicketUpdatedIcon.png',
    title: 'Priority Updated',
    subheading: `Ticket ${p.ticketNumber} priority has been updated.`,
    rows,
    buttonText: 'View Ticket',
    buttonUrl: `${appUrl}/tickets/${p.ticketId}?projectId=${p.projectId}`,
    showReplyCallout: false,
  });

  return {
    subject: `[${p.ticketNumber}] Priority changed to ${p.newPriority}`,
    html,
  };
}

export function buildAssigneeUpdatedEmail(
  p: TicketAssigneeUpdatedPayload,
  appUrl: string,
): { subject: string; html: string } {
  const rows: DataRow[] = [
    { label: 'Ticket', value: `${p.ticketNumber} - ${p.ticketTitle}` },
    { label: 'Project', value: p.projectName },
    { label: 'assigned to', value: p.newAssignee.name },
    // ...(p.priority
    //   ? [{
    //       label: 'Priority',
    //       value: '',
    //       dot: {
    //         color: PRIORITY_COLOR_HEX[normalizeKey(p.priority)] ?? DEFAULT_COLOR_HEX,
    //         text: getPriorityLabel(p.priority),
    //       },
    //     } as DataRow]
    //   : []),
    { label: 'Updated by', value: p.updatedBy.name },
  ];

  const html = renderNotificationEmail({
    appUrl,
    iconFileName: 'NewTicketAssignedIcon.png',
    title: 'Ticket Reassigned',
    subheading: 'This ticket has been reassigned.',
    rows,
    buttonText: 'View Ticket',
    buttonUrl: `${appUrl}/tickets/${p.ticketId}?projectId=${p.projectId}`,
    showReplyCallout: false,
  });

  return {
    subject: `[${p.ticketNumber}] Ticket assigned to ${p.newAssignee.name}`,
    html,
  };
}

export function buildAttachmentAddedEmail(
  p: TicketAttachmentAddedPayload,
  appUrl: string,
): { subject: string; html: string } {
  const rows: DataRow[] = [
    { label: 'Ticket', value: `${p.ticketNumber} - ${p.ticketTitle}` },
    { label: 'Project', value: p.projectName },
    { label: 'Uploaded by', value: p.uploadedBy.name },
    { label: 'File name', value: p.fileName },
    { label: 'File size', value: p.fileSize },
  ];

  const html = renderNotificationEmail({
    appUrl,
    iconFileName: 'AttachmentAddedIcon.png',
    title: 'Attachment Added',
    subheading: `${p.uploadedBy.name} added an attachment to a ticket you're following.`,
    rows,
    buttonText: 'View Attachment',
    buttonUrl: `${appUrl}/tickets/${p.ticketId}`,
    // attachments: p.attachments, // NEW
    showReplyCallout: false,
  });

  return {
    subject: `[${p.ticketNumber}] Attachment added: ${p.fileName}`,
    html,
  };
}

export function buildProjectAssignedEmail(
  p: ProjectAssignedPayload,
  appUrl: string,
): { subject: string; html: string } {
  const rows: DataRow[] = [
    { label: 'Project', value: p.projectName },
    { label: 'Assigned by', value: p.assignedBy.name },
    // { label: 'Team', value: `${p.members.length} member${p.members.length === 1 ? '' : 's'}` },
  ];

  const html = renderNotificationEmail({
    appUrl,
    iconFileName: 'ProjectAssignedIcon.png',
    title: 'Project Assigned',
    subheading: `"${p.projectName}" has been assigned to you by ${p.assignedBy.name}.`,
    rows,
    buttonText: 'View Projects',
    buttonUrl: `${appUrl}/projects/${p.projectId}`,
    showReplyCallout: false,
  });

  return {
    subject: `Project "${truncateSubject(p.projectName)}" has been assigned to you`,
    html,
  };
}

export function buildProjectUnassignedEmail(
  p: ProjectUnassignedPayload,
  appUrl: string,
): { subject: string; html: string } {
  const rows: DataRow[] = [
    { label: 'Project', value: p.projectName },
    { label: 'Unassigned by', value: p.unassignedBy.name },
    // { label: 'Team', value: `${p.members.length} member${p.members.length === 1 ? '' : 's'}` },
  ];

  const html = renderNotificationEmail({
    appUrl,
    iconFileName: 'ProjectAssignedIcon.png',
    title: 'Project UnAssigned',
    subheading: `"${p.projectName}" has been unassigned from you by ${p.unassignedBy.name}.`,
    rows,
    buttonText: 'View Projects',
    buttonUrl: `${appUrl}/projects`,
    showReplyCallout: false,
  });

  return {
    subject: `Project "${truncateSubject(p.projectName)}" has been unassigned from you`,
    html,
  };
}

export function buildThreadMessageCreatedEmail(
  p: ThreadMessageCreatedPayload,
  appUrl: string,
): { subject: string; html: string } {
  const rows: DataRow[] = [
    { label: 'Project', value: p.projectName },
    { label: 'Posted by', value: p.createdBy.name },
    { label: 'Message', value: p.message },
  ];

  const html = renderNotificationEmail({
    appUrl,
    iconFileName: 'ThreadMessageIcon.png',
    title: 'New Thread Message',
    subheading: `${p.createdBy.name} posted a new message in ${p.projectName}.`,
    rows,
    buttonText: 'View Thread',
    buttonUrl: `${appUrl}/projects/${p.projectId}?t=1`,
    showReplyCallout: false,
    // attachments: p.attachments, // NEW
  });

  return {
    subject: `New thread message in ${truncateSubject(p.projectName)}`,
    html,
  };
}

export function buildThreadReplyCreatedEmail(
  p: ThreadReplyCreatedPayload,
  appUrl: string,
): { subject: string; html: string } {
  const rows: DataRow[] = [
    { label: 'Project', value: p.projectName },
    { label: 'Thread Message', value: p.parentMessage.message },
    { label: 'Posted by', value: p.createdBy.name },
    { label: 'Reply Posted', value: p.message },
  ];

  const html = renderNotificationEmail({
    appUrl,
    iconFileName: 'ThreadMessageIcon.png',
    title: 'New Thread Reply',
    subheading: `${p.createdBy.name} posted a new reply in ${p.projectName}.`,
    rows,
    buttonText: 'View Thread Reply',
    buttonUrl: `${appUrl}/projects/${p.projectId}?t=1`,
    showReplyCallout: false,
    // attachments: p.attachments, // NEW
  });

  return {
    subject: `New thread reply in ${truncateSubject(p.projectName)}`,
    html,
  };
}

function htmlToText(html: string): string {
  if (!html) return '';

  let text = html
    // block-level tags → line breaks before stripping
    .replace(/<\/(p|div|h[1-6]|blockquote|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    // strip all remaining tags
    .replace(/<[^>]*>/g, '');

  // decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // trim each line, collapse 3+ blank lines down to a max of one blank line
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  return text.trim();
}
