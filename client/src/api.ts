export const BASE_URL = "http://localhost:8080";
const API_TOKEN = "change-me-to-a-long-random-token";

async function safeJson(r: Response) {
  const text = await r.text();

  if (!r.ok) {
    throw new Error(`HTTP ${r.status} ${r.statusText}: ${text.slice(0, 200)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text };
  }
}

export async function getJson(url: string) {
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });

  return safeJson(r);
}

export function health() {
  return getJson(`${BASE_URL}/health`);
}

export function listMailboxes() {
  return getJson(`${BASE_URL}/mailboxes`);
}

export function listMessages(
  mailbox: string,
  limit: number = 10,
  offset: number = 0,
  query?: string
) {
  const encodedMailbox = encodeURIComponent(mailbox);

  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (query && query.trim()) {
    params.set("query", query.trim());
  }

  return getJson(
    `${BASE_URL}/mailboxes/${encodedMailbox}/messages?${params.toString()}`
  );
}

export function getMessage(mailbox: string, uid: number) {
  const encodedMailbox = encodeURIComponent(mailbox);
  return getJson(`${BASE_URL}/mailboxes/${encodedMailbox}/messages/${uid}`);
}

export async function deleteMessage(mailbox: string, uid: number) {
  const encodedMailbox = encodeURIComponent(mailbox);

  const r = await fetch(
    `${BASE_URL}/mailboxes/${encodedMailbox}/messages/${uid}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
    }
  );

  return safeJson(r);
}

export async function send(data: any) {
  const r = await fetch(`${BASE_URL}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify(data),
  });

  return safeJson(r);
}