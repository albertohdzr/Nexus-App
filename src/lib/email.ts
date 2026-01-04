import { Resend } from "resend";
import type { EmailTemplateBase } from "@/src/types/email-template";

type EmailTokens = Record<string, string>;

type BuildEmailHtmlOptions = {
  bodyHtml: string;
  base?: EmailTemplateBase | null;
  previewText?: string;
  accentColor?: string;
  tokens?: EmailTokens;
};

type SendResendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string | string[];
};

const DEFAULT_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Nexus CRM <onboarding@team5526.com>";
const DEFAULT_ACCENT_COLOR = "#0f172a";

let resendClient: Resend | null = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY missing");
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export function renderTemplate(content: string, tokens: EmailTokens) {
  return content.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => {
    return tokens[key] ?? "";
  });
}

export function formatPlainTextAsHtml(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin: 0 0 12px;">${escapeHtml(line)}</p>`)
    .join("");
}

export function buildEmailHtml({
  bodyHtml,
  base,
  previewText,
  accentColor,
  tokens,
}: BuildEmailHtmlOptions) {
  const resolvedTokens = tokens || {};
  const resolvedBody = tokens ? renderTemplate(bodyHtml, resolvedTokens) : bodyHtml;
  const headerHtml = base?.header_html
    ? renderTemplate(base.header_html, resolvedTokens)
    : "";
  const footerHtml = base?.footer_html
    ? renderTemplate(base.footer_html, resolvedTokens)
    : "";
  const logoHtml = base?.logo_url
    ? `<img src="${base.logo_url}" alt="Logo" style="height:48px; display:block; margin:0 0 16px;" />`
    : "";
  const safePreviewText = previewText ? escapeHtml(previewText) : "";
  const highlight = accentColor || DEFAULT_ACCENT_COLOR;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safePreviewText || "Nexus"}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f3f4f6;">
    ${
      safePreviewText
        ? `<span style="display:none; visibility:hidden; opacity:0; height:0; width:0; overflow:hidden; color:transparent;">${safePreviewText}</span>`
        : ""
    }
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
            <tr>
              <td style="background-color:${highlight}; height:6px; line-height:6px; font-size:0;"></td>
            </tr>
            <tr>
              <td style="padding:32px; font-family:'Helvetica Neue', Arial, sans-serif; color:#111827;">
                ${logoHtml}
                ${
                  headerHtml
                    ? `<div style="margin:0 0 16px; font-size:16px; line-height:1.5;">${headerHtml}</div>`
                    : ""
                }
                <div style="font-size:15px; line-height:1.7; color:#111827;">
                  ${resolvedBody}
                </div>
              </td>
            </tr>
            ${
              footerHtml
                ? `<tr>
              <td style="padding:16px 32px 28px; border-top:1px solid #e5e7eb; font-family:'Helvetica Neue', Arial, sans-serif; font-size:12px; line-height:1.5; color:#6b7280;">
                ${footerHtml}
              </td>
            </tr>`
                : ""
            }
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function toPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
}: SendResendEmailOptions) {
  const resend = getResendClient();

  return resend.emails.send({
    from: from || DEFAULT_FROM_EMAIL,
    to,
    subject,
    html,
    text,
    replyTo,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
