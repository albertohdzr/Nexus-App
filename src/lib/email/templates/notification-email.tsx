/**
 * Notification Email Template
 * Generic notification email built with raw HTML for Resend.
 *
 * NOTE: We use inline HTML instead of @react-email/components to avoid
 * adding another dependency. This template is designed to be compatible
 * with Resend's `html` parameter.
 */

interface NotificationEmailProps {
    recipientName: string;
    title: string;
    body?: string | null;
    actionUrl?: string | null;
    actionLabel?: string;
    orgName?: string;
}

export function buildNotificationEmailHtml({
    recipientName,
    title,
    body,
    actionUrl,
    actionLabel = "Ver en Nexus",
    orgName = "Nexus",
}: NotificationEmailProps): string {
    const buttonHtml = actionUrl
        ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td style="background-color: #18181b; border-radius: 6px; padding: 12px 24px;">
          <a href="${escapeHtml(actionUrl)}" target="_blank"
             style="color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${escapeHtml(actionLabel)}
          </a>
        </td>
      </tr>
    </table>`
        : "";

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
         style="background-color: #f4f4f5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0"
               width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <h2 style="margin: 0; color: #18181b; font-size: 18px; font-weight: 700; letter-spacing: -0.02em;">
                ${escapeHtml(orgName)}
              </h2>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 16px 32px;">
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 0;" />
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 32px;">
              <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 15px; line-height: 1.6;">
                Hola <strong>${escapeHtml(recipientName)}</strong>,
              </p>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 0 32px;">
              <h3 style="margin: 0 0 8px 0; color: #18181b; font-size: 16px; font-weight: 600;">
                ${escapeHtml(title)}
              </h3>
            </td>
          </tr>

          <!-- Body -->
          ${body
            ? `<tr>
            <td style="padding: 0 32px;">
              <p style="margin: 0; color: #52525b; font-size: 14px; line-height: 1.6;">
                ${escapeHtml(body)}
              </p>
            </td>
          </tr>`
            : ""
        }

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px;">
              ${buttonHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px 32px 32px;">
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 0 0 16px 0;" />
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.5;">
                Recibiste este correo porque eres parte del equipo de admisiones en ${escapeHtml(orgName)}.
                Si no deseas recibir estas notificaciones, puedes desactivarlas desde la configuración de tu perfil.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
