import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Sender address. The default `onboarding@resend.dev` is Resend's shared sandbox
// sender, which can ONLY deliver to the address that owns the Resend account —
// every other recipient is rejected. Real delivery needs a domain verified at
// resend.com/domains and EMAIL_FROM set to an address on it.
const FROM = process.env.EMAIL_FROM ?? 'PACU Legal Assistance <onboarding@resend.dev>';

// Public origin of the frontend — every link and logo image in an email resolves
// against it. Reuses the origin CORS is already locked to, so there is a single
// thing to configure per environment. Resolved per-send (not at module load) so a
// missing value surfaces as a failed send rather than a crashed boot.
function appUrl(): string {
  const url = process.env.FRONTEND_URL;
  if (!url) {
    throw new Error('FRONTEND_URL is not set — cannot build email links');
  }
  return url.replace(/\/+$/, '');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function buildHtml(params: {
  firstName: string;
  lastName: string;
  referenceNo: string;
  transactionDate: string;
  legalAdvice: string;
  referredOfficeName: string | null;
  referredReason: string | null;
}): string {
  const { firstName, lastName, referenceNo, transactionDate, legalAdvice, referredOfficeName, referredReason } = params;
  const APP_URL = appUrl();
  const fullName = (firstName.trim() || lastName.trim()) ? `${firstName} ${lastName}`.trim() : null;
  const dateFormatted = formatDate(transactionDate);

  const referralBlock = referredOfficeName ? `
    <tr>
      <td style="padding: 0 40px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;border-left:4px solid #1a3a8f;border-radius:0 6px 6px 0;">
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#1a3a8f;">Referral</p>
              <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#1a3a8f;">${referredOfficeName}</p>
              ${referredReason ? `<p style="margin:6px 0 0;font-size:14px;color:#374151;">${referredReason}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>PACU Legal Consultation Summary</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- DOLE Header — official letterhead: white background, blue text -->
          <tr>
            <td style="background:#ffffff;padding:18px 28px;" align="center">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <!-- DOLE Logo -->
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="${APP_URL}/dole-logo.png" alt="DOLE" width="46" style="display:block;height:auto;" />
                  </td>
                  <!-- Center: Republic text + rule, Department text below -->
                  <td style="vertical-align:middle;width:340px;">
                    <p style="margin:0 0 1px;font-size:11px;color:#1a3a8f;letter-spacing:0.02em;">Republic of the Philippines</p>
                    <div style="height:2px;background:#1a3a8f;font-size:0;line-height:0;margin:0 0 2px;"></div>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#2952a3;letter-spacing:0.02em;text-transform:uppercase;white-space:nowrap;">Department of Labor and Employment</p>
                  </td>
                  <!-- Bagong Pilipinas Logo -->
                  <td style="vertical-align:middle;padding-left:16px;">
                    <img src="${APP_URL}/Bagong Pilipinas Logo.png" alt="Bagong Pilipinas" width="46" style="display:block;height:auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PACU Sub-header -->
          <tr>
            <td style="background:#2d4fa3;padding:10px 32px;">
              <p style="margin:0;font-size:11px;color:#e0e7ff;letter-spacing:0.08em;text-transform:uppercase;">Public Assistance and Complaints Unit &mdash; Legal Consultation Summary</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 24px;">
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">${fullName ? `Dear <strong style="color:#111827;">${fullName}</strong>,` : 'Dear Client,'}</p>
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                Thank you for visiting the PACU. Below is a summary of your legal consultation for your reference.
              </p>
            </td>
          </tr>

          <!-- Meta info -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px;border-right:1px solid #e5e7eb;width:50%;">
                    <p style="margin:0 0 2px;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;">Reference No.</p>
                    <p style="margin:0;font-size:14px;font-weight:700;color:#111827;font-family:monospace;">${referenceNo}</p>
                  </td>
                  <td style="padding:16px 20px;width:50%;">
                    <p style="margin:0 0 2px;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;">Date of Consultation</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${dateFormatted}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Legal Advice -->
          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;">Legal Advice Provided</p>
              <p style="margin:0;font-size:14px;color:#1f2937;line-height:1.75;white-space:pre-line;">${legalAdvice}</p>
            </td>
          </tr>

          ${referralBlock}

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>

          <!-- Client satisfaction survey CTA -->
          <tr>
            <td style="padding:28px 40px 8px;" align="center">
              <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#111827;">How did we do?</p>
              <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">
                Your feedback helps us improve our service. Please take a moment to rate your experience.
              </p>
              <a href="${APP_URL}/feedback?ref=${encodeURIComponent(referenceNo)}" style="display:inline-block;background:#1a3a8f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;">Answer the Feedback Survey</a>
            </td>
          </tr>

          <!-- Footer note -->
          <tr>
            <td style="padding:24px 40px 36px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                This is an official record of your consultation with the DOLE Public Assistance and Complaints Unit.
                Please keep this for your reference. If you have further concerns, you may return to the PACU office
                or contact us directly.
              </p>
            </td>
          </tr>

          <!-- Footer bar -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 40px;">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
                Department of Labor and Employment &bull; Public Assistance and Complaints Unit
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

function buildPasswordResetHtml(params: {
  firstName: string;
  lastName: string;
  email: string;
  tempPassword: string;
}): string {
  const { firstName, lastName, email, tempPassword } = params;
  const APP_URL = appUrl();
  const fullName = `${firstName} ${lastName}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>PACU Account Password Reset</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- DOLE Header — official letterhead: white background, blue text -->
          <tr>
            <td style="background:#ffffff;padding:18px 28px;" align="center">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="${APP_URL}/dole-logo.png" alt="DOLE" width="46" style="display:block;height:auto;" />
                  </td>
                  <td style="vertical-align:middle;width:340px;">
                    <p style="margin:0 0 1px;font-size:11px;color:#1a3a8f;letter-spacing:0.02em;">Republic of the Philippines</p>
                    <div style="height:2px;background:#1a3a8f;font-size:0;line-height:0;margin:0 0 2px;"></div>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#2952a3;letter-spacing:0.02em;text-transform:uppercase;white-space:nowrap;">Department of Labor and Employment</p>
                  </td>
                  <td style="vertical-align:middle;padding-left:16px;">
                    <img src="${APP_URL}/Bagong Pilipinas Logo.png" alt="Bagong Pilipinas" width="46" style="display:block;height:auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PACU Sub-header -->
          <tr>
            <td style="background:#2d4fa3;padding:10px 32px;">
              <p style="margin:0;font-size:11px;color:#e0e7ff;letter-spacing:0.08em;text-transform:uppercase;">Public Assistance and Complaints Unit &mdash; Account Security</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 16px;">
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Dear <strong style="color:#111827;">${fullName}</strong>,</p>
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                Your PACU System account password has been reset by an administrator. Use the
                temporary credentials below to sign in. For your security, two-factor
                authentication has also been removed and must be set up again.
              </p>
            </td>
          </tr>

          <!-- Credentials box -->
          <tr>
            <td style="padding:8px 40px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0 0 2px;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;">Email (username)</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${email}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 2px;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;">Temporary password</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#1a3a8f;font-family:monospace;letter-spacing:0.03em;">${tempPassword}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Next steps -->
          <tr>
            <td style="padding:16px 40px 8px;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;">What happens on your next login</p>
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="padding:0 0 8px;font-size:14px;color:#1f2937;line-height:1.6;">
                    <strong style="color:#1a3a8f;">1.</strong> Sign in with the temporary password above.
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px;font-size:14px;color:#1f2937;line-height:1.6;">
                    <strong style="color:#1a3a8f;">2.</strong> Set a new password of your own choosing.
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;font-size:14px;color:#1f2937;line-height:1.6;">
                    <strong style="color:#1a3a8f;">3.</strong> Set up two-factor authentication by scanning the QR code with an authenticator app.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:20px 40px 8px;" align="center">
              <a href="${APP_URL}/login" style="display:inline-block;background:#1a3a8f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;">Sign in to PACU System</a>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:16px 40px 0;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>

          <!-- Footer note -->
          <tr>
            <td style="padding:20px 40px 32px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                If you did not expect this reset, contact your PACU administrator immediately.
                This temporary password grants access to your account &mdash; do not share it.
              </p>
            </td>
          </tr>

          <!-- Footer bar -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 40px;">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
                Department of Labor and Employment &bull; Public Assistance and Complaints Unit
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

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  lawyer: 'Lawyer',
  personnel: 'PACU Personnel',
  support_staff: 'Support Staff',
};

function buildAccountCreatedHtml(params: {
  firstName: string;
  lastName: string;
  email: string;
  tempPassword: string;
  role: string;
}): string {
  const { firstName, lastName, email, tempPassword, role } = params;
  const APP_URL = appUrl();
  const fullName = `${firstName} ${lastName}`;
  const roleLabel = ROLE_LABELS[role] ?? role;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Welcome to the PACU System</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- DOLE Header — official letterhead: white background, blue text -->
          <tr>
            <td style="background:#ffffff;padding:18px 28px;" align="center">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="${APP_URL}/dole-logo.png" alt="DOLE" width="46" style="display:block;height:auto;" />
                  </td>
                  <td style="vertical-align:middle;width:340px;">
                    <p style="margin:0 0 1px;font-size:11px;color:#1a3a8f;letter-spacing:0.02em;">Republic of the Philippines</p>
                    <div style="height:2px;background:#1a3a8f;font-size:0;line-height:0;margin:0 0 2px;"></div>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#2952a3;letter-spacing:0.02em;text-transform:uppercase;white-space:nowrap;">Department of Labor and Employment</p>
                  </td>
                  <td style="vertical-align:middle;padding-left:16px;">
                    <img src="${APP_URL}/Bagong Pilipinas Logo.png" alt="Bagong Pilipinas" width="46" style="display:block;height:auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PACU Sub-header -->
          <tr>
            <td style="background:#2d4fa3;padding:10px 32px;">
              <p style="margin:0;font-size:11px;color:#e0e7ff;letter-spacing:0.08em;text-transform:uppercase;">Public Assistance and Complaints Unit &mdash; Account Created</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 16px;">
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Dear <strong style="color:#111827;">${fullName}</strong>,</p>
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                An account has been created for you on the PACU System with the role of
                <strong style="color:#1a3a8f;">${roleLabel}</strong>. Use the temporary credentials
                below to sign in for the first time.
              </p>
            </td>
          </tr>

          <!-- Credentials box -->
          <tr>
            <td style="padding:8px 40px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0 0 2px;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;">Website</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#1a3a8f;">
                      <a href="${APP_URL}/login" style="color:#1a3a8f;text-decoration:none;">${APP_URL}/login</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0 0 2px;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;">Email (username)</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${email}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 2px;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;">Temporary password</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#1a3a8f;font-family:monospace;letter-spacing:0.03em;">${tempPassword}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- How to log in -->
          <tr>
            <td style="padding:20px 40px 8px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;">How to log in for the first time</p>
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="padding:0 0 10px;font-size:14px;color:#1f2937;line-height:1.6;">
                    <strong style="color:#1a3a8f;">1.</strong> Go to the website link above and enter your email and the temporary password.
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px;font-size:14px;color:#1f2937;line-height:1.6;">
                    <strong style="color:#1a3a8f;">2.</strong> You will be asked to set a new password of your own. Choose one only you know.
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px;font-size:14px;color:#1f2937;line-height:1.6;">
                    <strong style="color:#1a3a8f;">3.</strong> Install an authenticator app (such as Google Authenticator or Microsoft Authenticator) on your phone if you do not have one.
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px;font-size:14px;color:#1f2937;line-height:1.6;">
                    <strong style="color:#1a3a8f;">4.</strong> Scan the QR code shown on screen with that app, then enter the 6-digit code it displays to finish setting up two-factor authentication.
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;font-size:14px;color:#1f2937;line-height:1.6;">
                    <strong style="color:#1a3a8f;">5.</strong> From then on, you will sign in with your email, your new password, and a fresh 6-digit code from the app.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:20px 40px 8px;" align="center">
              <a href="${APP_URL}/login" style="display:inline-block;background:#1a3a8f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;">Sign in to PACU System</a>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:16px 40px 0;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>

          <!-- Footer note -->
          <tr>
            <td style="padding:20px 40px 32px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                This temporary password grants access to your account &mdash; do not share it with anyone.
                If you were not expecting this account, contact your PACU administrator immediately.
              </p>
            </td>
          </tr>

          <!-- Footer bar -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 40px;">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
                Department of Labor and Employment &bull; Public Assistance and Complaints Unit
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

export async function sendAccountCreated(params: {
  toEmail: string;
  firstName: string;
  lastName: string;
  tempPassword: string;
  role: string;
}): Promise<void> {
  const html = buildAccountCreatedHtml({
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.toEmail,
    tempPassword: params.tempPassword,
    role: params.role,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: 'Your PACU System account — sign-in details',
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendPasswordReset(params: {
  toEmail: string;
  firstName: string;
  lastName: string;
  tempPassword: string;
}): Promise<void> {
  const html = buildPasswordResetHtml({
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.toEmail,
    tempPassword: params.tempPassword,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: 'Your PACU System password has been reset',
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendConsultationSummary(params: {
  toEmail: string;
  firstName: string;
  lastName: string;
  referenceNo: string;
  transactionDate: string;
  legalAdvice: string;
  referredOfficeName: string | null;
  referredReason: string | null;
}): Promise<void> {
  const html = buildHtml(params);

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.toEmail,
    subject: `Your PACU Legal Consultation Summary — ${params.referenceNo}`,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}
