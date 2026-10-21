import { getAccessToken } from './googleAuth.ts';

export interface GmailMessagePreview {
  id: string;
  threadId: string;
  snippet: string;
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
}

// Convert RFC 2822 email into base64url encoding
function createBase64RawEmail(to: string, subject: string, body: string): string {
  const emailLines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
  ];
  const email = emailLines.join('\r\n');
  return btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send an email directly using the user's connected Gmail account.
 */
export async function sendGmailMessage(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; id?: string; threadId?: string; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace not connected. Please sign in with Google first.');
  }

  const raw = createBase64RawEmail(to, subject, body);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gmail API send error (${res.status})`);
  }

  const data = await res.json();
  return { success: true, id: data.id, threadId: data.threadId };
}

/**
 * Create a draft in the user's connected Gmail account without sending immediately.
 */
export async function createGmailDraft(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace not connected. Please sign in with Google first.');
  }

  const raw = createBase64RawEmail(to, subject, body);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gmail API draft error (${res.status})`);
  }

  const data = await res.json();
  return { success: true, id: data.id };
}

/**
 * Fetch recent deal or brokerage related emails from Gmail.
 */
export async function fetchRecentGmailMessages(
  query: string = '',
  maxResults: number = 6
): Promise<GmailMessagePreview[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const qParam = query ? `&q=${encodeURIComponent(query)}` : '';
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${qParam}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!listRes.ok) return [];

  const listData = await listRes.json();
  const messages = listData.messages || [];

  const detailsPromises = messages.map(async (msg: { id: string }) => {
    try {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const headers = data.payload?.headers || [];

      const getHeader = (name: string) =>
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      return {
        id: data.id,
        threadId: data.threadId,
        snippet: data.snippet || '',
        subject: getHeader('Subject') || '(No Subject)',
        from: getHeader('From'),
        to: getHeader('To'),
        date: getHeader('Date'),
      } as GmailMessagePreview;
    } catch {
      return null;
    }
  });

  const resolved = await Promise.all(detailsPromises);
  return resolved.filter((m): m is GmailMessagePreview => m !== null);
}

/**
 * Batch create multiple drafts in user's Gmail in one call.
 */
export async function createBatchGmailDrafts(
  drafts: Array<{ to: string; subject: string; body: string }>
): Promise<{ success: boolean; createdCount: number; errors: string[] }> {
  const errors: string[] = [];
  let createdCount = 0;

  for (const draft of drafts) {
    try {
      await createGmailDraft(draft.to, draft.subject, draft.body);
      createdCount++;
    } catch (err: any) {
      errors.push(`${draft.to}: ${err.message || err}`);
    }
  }

  return {
    success: errors.length === 0,
    createdCount,
    errors,
  };
}

/**
 * Batch send multiple messages via user's Gmail.
 */
export async function sendBatchGmailMessages(
  messages: Array<{ to: string; subject: string; body: string }>
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  const errors: string[] = [];
  let sentCount = 0;

  for (const msg of messages) {
    try {
      await sendGmailMessage(msg.to, msg.subject, msg.body);
      sentCount++;
    } catch (err: any) {
      errors.push(`${msg.to}: ${err.message || err}`);
    }
  }

  return {
    success: errors.length === 0,
    sentCount,
    errors,
  };
}
