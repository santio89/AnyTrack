type TrackerFailureEmailInput = {
  to: string;
  trackerDescription: string;
  trackerUrl: string;
  errorMessage: string;
};

type TrackerChangeEmailInput = {
  to: string;
  trackerDescription: string;
  trackerUrl: string;
  previousValue: string;
  currentValue: string;
  changeSummary?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function isEmailNotificationsConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL);
}

export async function sendTrackerChangeEmail(input: TrackerChangeEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn(
      "[AnyTrack] Email notification skipped: set RESEND_API_KEY and NOTIFICATION_FROM_EMAIL",
    );
    return;
  }

  const subject = `AnyTrack: "${input.trackerDescription}" changed`;
  const summary =
    input.changeSummary ??
    `Changed from "${input.previousValue}" to "${input.currentValue}".`;
  const html = `
    <p>The tracked value for <strong>${escapeHtml(input.trackerDescription)}</strong> changed.</p>
    <p><strong>Summary:</strong> ${escapeHtml(summary)}</p>
    <p><strong>URL:</strong> <a href="${escapeHtml(input.trackerUrl)}">${escapeHtml(input.trackerUrl)}</a></p>
    <p><strong>Previous:</strong> ${escapeHtml(input.previousValue)}</p>
    <p><strong>Current:</strong> ${escapeHtml(input.currentValue)}</p>
  `.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend API error (${response.status}): ${details}`);
  }
}

export async function sendTrackerFailureEmail(input: TrackerFailureEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn(
      "[AnyTrack] Email notification skipped: set RESEND_API_KEY and NOTIFICATION_FROM_EMAIL",
    );
    return;
  }

  const subject = `AnyTrack: "${input.trackerDescription}" run failed`;
  const html = `
    <p>A scheduled or manual run failed for <strong>${escapeHtml(input.trackerDescription)}</strong>.</p>
    <p><strong>Error:</strong> ${escapeHtml(input.errorMessage)}</p>
    <p><strong>URL:</strong> <a href="${escapeHtml(input.trackerUrl)}">${escapeHtml(input.trackerUrl)}</a></p>
  `.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend API error (${response.status}): ${details}`);
  }
}
