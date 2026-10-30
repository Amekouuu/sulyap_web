// Plain, readable e-mail templates. Each returns { subject, text, html }.
import { config } from '../config.js';

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#F7F4EE;font-family:Arial,sans-serif;color:#252927">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:22px;font-weight:800;color:#234638;margin:0 0 24px">Sulyap</p>
<div style="background:#ffffff;border:1px solid #D9E0DB;border-radius:16px;padding:28px">
<h1 style="font-size:20px;color:#234638;margin:0 0 12px">${escape(title)}</h1>${bodyHtml}</div>
<p style="font-size:12px;color:#5C6862;margin-top:20px">Sulyap: lesser-known tourist destinations in Pampanga.</p>
</div></body></html>`;
}

const button = (href, label) =>
  `<p style="margin:24px 0"><a href="${href}" style="background:#234638;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">${escape(label)}</a></p>`;

export function verificationEmail({ fullName, token }) {
  const link = `${config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return {
    subject: 'Verify your e-mail for Sulyap',
    text: `Hi ${fullName},\n\nConfirm your e-mail address to continue setting up your Sulyap account:\n${link}\n\nThis link expires in 24 hours. If you did not sign up, you can ignore this e-mail.`,
    html: layout(
      'Verify your e-mail',
      `<p>Hi ${escape(fullName)},</p><p>Confirm your e-mail address to continue setting up your Sulyap account.</p>${button(link, 'Verify e-mail')}<p style="font-size:13px;color:#5C6862">This link expires in 24 hours. If you did not sign up, you can ignore this e-mail.</p>`,
    ),
  };
}

export function verificationResultEmail({ fullName, approved, reason }) {
  const link = `${config.appUrl}/${approved ? '' : 'upload-id'}`;
  const subject = approved ? 'Your Sulyap account is verified' : 'Your ID could not be verified';
  const text = approved
    ? `Hi ${fullName},\n\nYour ID has been verified. You can now post reviews, ratings, photos, reports, and nominations.\n${link}`
    : `Hi ${fullName},\n\nYour ID could not be verified.\nReason: ${reason}\n\nYou can upload a new ID here: ${link}`;
  const html = layout(
    approved ? 'Your account is verified' : 'Your ID could not be verified',
    approved
      ? `<p>Hi ${escape(fullName)},</p><p>Your ID has been verified. You can now post reviews, ratings, photos, reports, and nominations.</p>${button(link, 'Open Sulyap')}`
      : `<p>Hi ${escape(fullName)},</p><p>Your ID could not be verified.</p><p><strong>Reason:</strong> ${escape(reason)}</p>${button(link, 'Upload a new ID')}`,
  );
  return { subject, text, html };
}

const NOTICE_SUBJECTS = {
  account_verification: 'Your Sulyap account',
  new_nomination: 'A new nomination is waiting for screening',
  routed_nomination: 'A nomination was routed to you',
  endorsement: 'Your nomination was endorsed',
  returned: 'Your nomination was returned',
  rejected: 'An update on your nomination',
  removed: 'Your post was removed',
};

// The e-mail copy of an in-app notification.
export function notificationEmail({ fullName, type, message }) {
  const subject = NOTICE_SUBJECTS[type] || 'An update from Sulyap';
  const link = `${config.appUrl}/notifications`;
  return {
    subject,
    text: `Hi ${fullName},\n\n${message}\n\nSee all your notifications: ${link}`,
    html: layout(
      subject,
      `<p>Hi ${escape(fullName)},</p><p>${escape(message)}</p>${button(link, 'Open notifications')}`,
    ),
  };
}

// The monthly newsletter of newly endorsed destinations. unsubscribeUrl turns it off in one click.
export function newsletterEmail({ fullName, monthLabel, destinations, unsubscribeUrl }) {
  const subject = `New in Sulyap: ${monthLabel}`;
  const items = destinations.map((d) => ({ ...d, url: `${config.appUrl}/destinations/${d.id}` }));
  const text = `Hi ${fullName},\n\nNewly endorsed lesser-known destinations in Pampanga, ${monthLabel}:\n\n${items
    .map((d) => `- ${d.name} (${d.jurisdiction}): ${d.url}`)
    .join('\n')}\n\nStop the newsletter: ${unsubscribeUrl}`;
  const list = items
    .map(
      (d) =>
        `<li style="margin:0 0 12px"><a href="${d.url}" style="color:#234638;font-weight:bold">${escape(d.name)}</a><br><span style="font-size:13px;color:#5C6862">${escape(d.categories.join(', '))} · ${escape(d.jurisdiction)}</span></li>`,
    )
    .join('');
  const html = layout(
    `Newly endorsed in ${monthLabel}`,
    `<p>Hi ${escape(fullName)},</p><p>These lesser-known places in Pampanga were endorsed by Local Tourism Officers this month.</p><ul style="padding-left:18px">${list}</ul>${button(`${config.appUrl}/destinations`, 'Browse all destinations')}<p style="font-size:12px;color:#5C6862">You get this because you turned on the monthly newsletter. <a href="${unsubscribeUrl}" style="color:#5C6862">Unsubscribe</a> or change it in Account Settings.</p>`,
  );
  return { subject, text, html };
}
