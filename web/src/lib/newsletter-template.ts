interface NewsletterData {
  userName: string;
  weeklyPick: {
    title: string;
    slug: string;
    one_sentence: string;
    importance: string;
  };
  collectionRecommendation: string;
  trending: { title: string; slug: string }[];
  continuityFact: string;
  unsubscribeUrl: string;
}

export function buildNewsletterHtml(data: NewsletterData): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://marvelcartographer.com";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Watcher's Weekly</title>
</head>
<body style="margin:0;padding:0;background-color:#0d1117;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto;padding:20px;">
    <tr>
      <td style="padding:24px 0;text-align:center;border-bottom:1px solid #30363d;">
        <div style="font-size:24px;font-weight:bold;color:#bb86fc;letter-spacing:2px;">THE WATCHER'S WEEKLY</div>
        <div style="font-size:12px;color:#8b949e;margin-top:4px;">Your personalized Marvel reading intelligence</div>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding:20px 0 12px;">
        <p style="font-size:14px;color:#e6edf3;margin:0;">Greetings, ${escapeHtml(data.userName)}.</p>
        <p style="font-size:13px;color:#8b949e;margin:8px 0 0;">The Watcher has observed the multiverse this week and brings you these recommendations.</p>
      </td>
    </tr>

    <!-- Weekly Pick -->
    <tr>
      <td style="padding:16px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background-color:#161b22;border:1px solid #bb86fc;border-radius:8px;">
          <tr>
            <td style="padding:16px;">
              <div style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#bb86fc;letter-spacing:1px;margin-bottom:8px;">This Week's Pick</div>
              <div style="font-size:16px;font-weight:bold;color:#e6edf3;margin-bottom:4px;">
                <a href="${baseUrl}/edition/${escapeHtml(data.weeklyPick.slug)}" style="color:#e6edf3;text-decoration:none;">${escapeHtml(data.weeklyPick.title)}</a>
              </div>
              <div style="font-size:11px;font-weight:bold;text-transform:uppercase;color:${data.weeklyPick.importance === "essential" ? "#ff1744" : "#f0a500"};margin-bottom:8px;">${escapeHtml(data.weeklyPick.importance)}</div>
              <p style="font-size:13px;color:#8b949e;margin:0;">${escapeHtml(data.weeklyPick.one_sentence)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Collection Recommendation -->
    <tr>
      <td style="padding:16px 0;">
        <div style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#f0a500;letter-spacing:1px;margin-bottom:8px;">Based on Your Collection</div>
        <p style="font-size:13px;color:#8b949e;margin:0;">${escapeHtml(data.collectionRecommendation)}</p>
      </td>
    </tr>

    <!-- Trending -->
    ${data.trending.length > 0 ? `
    <tr>
      <td style="padding:16px 0;border-top:1px solid #30363d;">
        <div style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#4fc3f7;letter-spacing:1px;margin-bottom:8px;">Trending This Week</div>
        ${data.trending.map((t) => `
          <div style="padding:6px 0;">
            <a href="${baseUrl}/edition/${escapeHtml(t.slug)}" style="font-size:13px;color:#4fc3f7;text-decoration:none;">${escapeHtml(t.title)}</a>
          </div>
        `).join("")}
      </td>
    </tr>
    ` : ""}

    <!-- Continuity Fact -->
    <tr>
      <td style="padding:16px 0;border-top:1px solid #30363d;">
        <div style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#00e676;letter-spacing:1px;margin-bottom:8px;">Continuity Corner</div>
        <p style="font-size:13px;color:#8b949e;margin:0;">${escapeHtml(data.continuityFact)}</p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:24px 0;border-top:1px solid #30363d;text-align:center;">
        <p style="font-size:11px;color:#6e7681;margin:0;">
          Sent by <a href="${baseUrl}" style="color:#bb86fc;text-decoration:none;">The Marvel Cartographer</a>
        </p>
        <p style="font-size:11px;color:#6e7681;margin:8px 0 0;">
          <a href="${escapeHtml(data.unsubscribeUrl)}" style="color:#6e7681;text-decoration:underline;">Unsubscribe</a>
        </p>
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
    .replace(/"/g, "&quot;");
}
