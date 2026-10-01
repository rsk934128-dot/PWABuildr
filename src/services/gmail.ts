import { getAccessToken } from './auth';

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  bodyText: string;
  labelIds: string[];
}

function decodeBase64Url(input: string): string {
  try {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

function encodeBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface GmailPayloadPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPayloadPart[];
}

function extractBodyText(payload?: GmailPayloadPart): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts && payload.parts.length > 0) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const nested = extractBodyText(part);
      if (nested) return nested;
    }
  }
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  return '';
}

export async function listGmailMessages(
  query = '',
  maxResults = 12
): Promise<GmailMessageSummary[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const params = new URLSearchParams({
    maxResults: String(maxResults),
  });
  if (query.trim()) {
    params.set('q', query.trim());
  }

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (listRes.status === 401 || listRes.status === 403) {
    throw new Error('AUTH_REQUIRED');
  }

  if (!listRes.ok) {
    const errText = await listRes.text();
    throw new Error(`Gmail API error (${listRes.status}): ${errText}`);
  }

  const listData = await listRes.json();
  const messages: Array<{ id: string; threadId: string }> = listData.messages || [];

  if (messages.length === 0) {
    return [];
  }

  const detailed = await Promise.all(
    messages.slice(0, maxResults).map(async (msg) => {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!detailRes.ok) {
        return null;
      }
      const data = await detailRes.json();
      const headers: Array<{ name: string; value: string }> =
        data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const bodyText = extractBodyText(data.payload) || data.snippet || '';

      return {
        id: data.id,
        threadId: data.threadId,
        subject: getHeader('Subject') || '(No Subject)',
        from: getHeader('From') || 'Unknown Sender',
        to: getHeader('To') || '',
        date: getHeader('Date') || '',
        snippet: data.snippet || '',
        bodyText,
        labelIds: data.labelIds || [],
      } as GmailMessageSummary;
    })
  );

  return detailed.filter((item): item is GmailMessageSummary => item !== null);
}

export async function sendGmailMessage(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ id: string; threadId: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const cleanSubject = params.subject.replace(/[\r\n]+/g, ' ').trim();
  const cleanTo = params.to.replace(/[\r\n]+/g, ' ').trim();

  const mimeMessage = [
    `To: ${cleanTo}`,
    `Subject: ${cleanSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.body,
  ].join('\r\n');

  const raw = encodeBase64Url(mimeMessage);

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to send email (${res.status}): ${errText}`);
  }

  return res.json();
}
