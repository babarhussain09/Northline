const brand = 'Northline';

function layout(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;background:#f3f5f7;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#122033;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:32px;">
            <tr><td style="font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#0f766e;font-weight:700;">${brand}</td></tr>
            <tr><td style="font-size:24px;font-weight:700;padding:12px 0 8px;">${title}</td></tr>
            <tr><td style="font-size:15px;line-height:1.6;color:#334155;">${body}</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0;"><a href="${href}" style="background:#123044;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block;font-weight:600;">${label}</a></p>`;
}

export function welcomeEmail(name: string) {
  const text = `Welcome to ${brand}, ${name}. Your account is ready. Verify your email to check out.`;
  return {
    subject: `Welcome to ${brand}`,
    text,
    html: layout('Welcome', `<p>Hi ${name},</p><p>${text}</p>`),
  };
}

export function verificationEmail(name: string, link: string) {
  const text = `Hi ${name}, verify your email: ${link}`;
  return {
    subject: 'Verify your email',
    text,
    html: layout('Verify your email', `<p>Hi ${name},</p><p>Confirm your email address to finish setting up your account.</p>${button(link, 'Verify email')}<p>If you did not create an account, you can ignore this message.</p>`),
  };
}

export function passwordResetEmail(name: string, link: string) {
  const text = `Hi ${name}, reset your password: ${link}. This link expires in one hour.`;
  return {
    subject: 'Reset your password',
    text,
    html: layout('Reset your password', `<p>Hi ${name},</p><p>We received a request to reset your password. This link expires in one hour.</p>${button(link, 'Reset password')}<p>If you did not request this, you can ignore this message.</p>`),
  };
}

export function paymentSuccessEmail(name: string, orderNumber: string, total: string) {
  const text = `Hi ${name}, payment for order ${orderNumber} was received. Total ${total}.`;
  return {
    subject: `Payment received for ${orderNumber}`,
    text,
    html: layout('Payment received', `<p>Hi ${name},</p><p>We received your payment for order <strong>${orderNumber}</strong>.</p><p>Total: ${total}</p><p>Your project is now in the dashboard.</p>`),
  };
}

export function paymentFailedEmail(name: string, orderNumber: string) {
  const text = `Hi ${name}, payment for order ${orderNumber} did not go through.`;
  return {
    subject: `Payment failed for ${orderNumber}`,
    text,
    html: layout('Payment failed', `<p>Hi ${name},</p><p>The payment for order <strong>${orderNumber}</strong> did not complete. You can return to your cart and try again.</p>`),
  };
}

export function invoiceEmail(name: string, invoiceNumber: string, total: string) {
  const text = `Hi ${name}, invoice ${invoiceNumber} for ${total} is available in your dashboard.`;
  return {
    subject: `Invoice ${invoiceNumber}`,
    text,
    html: layout('Your invoice', `<p>Hi ${name},</p><p>Invoice <strong>${invoiceNumber}</strong> for ${total} is ready to download from your account.</p>`),
  };
}

export function projectCreatedEmail(name: string, projectNumber: string, projectName: string) {
  const text = `Hi ${name}, project ${projectNumber} (${projectName}) has been created.`;
  return {
    subject: `Project ${projectNumber} created`,
    text,
    html: layout('Project created', `<p>Hi ${name},</p><p><strong>${projectName}</strong> is now on your account as ${projectNumber}.</p>`),
  };
}

export function projectCompletedEmail(name: string, projectNumber: string, projectName: string) {
  const text = `Hi ${name}, project ${projectNumber} (${projectName}) is complete.`;
  return {
    subject: `Project ${projectNumber} completed`,
    text,
    html: layout('Project completed', `<p>Hi ${name},</p><p><strong>${projectName}</strong> (${projectNumber}) is complete.</p>`),
  };
}

export function demoRequestEmail(details: string) {
  return {
    subject: 'New demo request',
    text: details,
    html: layout('New demo request', `<pre style="white-space:pre-wrap;font-family:inherit;">${details}</pre>`),
  };
}

export function contactRequestEmail(details: string) {
  return {
    subject: 'New contact request',
    text: details,
    html: layout('New contact request', `<pre style="white-space:pre-wrap;font-family:inherit;">${details}</pre>`),
  };
}

export function refundEmail(name: string, amount: string) {
  const text = `Hi ${name}, a refund of ${amount} has been processed.`;
  return {
    subject: 'Refund processed',
    text,
    html: layout('Refund processed', `<p>Hi ${name},</p><p>A refund of <strong>${amount}</strong> has been processed. It can take a few days to appear on your statement.</p>`),
  };
}
