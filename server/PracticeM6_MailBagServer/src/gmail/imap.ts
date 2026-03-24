/**
 * IMAP access layer (Gmail) – uses imapflow
 * Features:
 * - list mailboxes
 * - list message headers with pagination
 * - search (extra feature) by subject/from/body
 * - fetch raw message source
 * - delete message (\Deleted + expunge)
 */
import { ImapFlow } from "imapflow";
import type { ServerInfo } from "../util/config";

export type MailboxInfo = {
  path: string;
  name: string;
  delimiter: string;
  specialUse?: string;
};

export type MessageHeader = {
  uid: number;
  subject: string;
  from: string;
  date?: string;
  flags: string[];
};

export type MessageFull = MessageHeader & {
  to?: string;
  text?: string; // raw RFC822 source for simplicity (easy to demo)
};

function clientFromConfig(cfg: ServerInfo): ImapFlow {
  return new ImapFlow({
    host: cfg.gmail.imap.host,
    port: cfg.gmail.imap.port,
    secure: cfg.gmail.imap.secure,
    auth: { user: cfg.gmail.user, pass: cfg.gmail.appPassword }
  });
}

function formatAddress(addr: any): string {
  if (!addr) return "";
  if (Array.isArray(addr)) {
    return addr
      .map((a) => (a?.name ? `${a.name} <${a.address}>` : a?.address))
      .filter(Boolean)
      .join(", ");
  }
  return addr?.name ? `${addr.name} <${addr.address}>` : (addr?.address ?? "");
}

function toIsoDate(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;
  const dateValue = value instanceof Date ? value : new Date(value);
  return Number.isNaN(dateValue.getTime()) ? undefined : dateValue.toISOString();
}

function flagsToArray(flags: Set<string> | undefined): string[] {
  return flags ? Array.from(flags) : [];
}

export async function listMailboxes(cfg: ServerInfo): Promise<MailboxInfo[]> {
  const client = clientFromConfig(cfg);
  await client.connect();
  try {
    const boxes: MailboxInfo[] = [];
    for (const mb of await client.list()) {
      boxes.push({ path: mb.path, name: mb.name, delimiter: mb.delimiter, specialUse: mb.specialUse });
    }
    return boxes;
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function listMessages(
  cfg: ServerInfo,
  mailbox: string,
  opts: { limit: number; offset: number; query?: string }
): Promise<{ total: number; items: MessageHeader[] }> {
  const client = clientFromConfig(cfg);
  await client.connect();
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      const searchQuery = opts.query?.trim()
        ? { or: [{ subject: opts.query }, { from: opts.query }, { body: opts.query }] }
        : { all: true };

      const searchResult = await client.search(searchQuery, { uid: true });
      const uids: number[] = searchResult === false ? [] : searchResult;
      uids.sort((a, b) => b - a); // newest first
      const total = uids.length;

      const slice = uids.slice(opts.offset, opts.offset + opts.limit);

      const items: MessageHeader[] = [];
      for await (const msg of client.fetch(slice, { envelope: true, flags: true, internalDate: true }, { uid: true })) {
        const env = msg.envelope;
        items.push({
          uid: msg.uid,
          subject: env?.subject ?? "",
          from: formatAddress(env?.from),
          date: toIsoDate(msg.internalDate),
          flags: flagsToArray(msg.flags)
        });
      }
      return { total, items };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function getMessage(cfg: ServerInfo, mailbox: string, uid: number): Promise<MessageFull | null> {
  const client = clientFromConfig(cfg);
  await client.connect();
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      const msg = await client.fetchOne(uid.toString(), { envelope: true, flags: true, internalDate: true, source: true }, { uid: true });
      if (!msg) return null;
      const env = msg.envelope;
      const raw = msg.source?.toString("utf-8") ?? "";
      return {
        uid,
        subject: env?.subject ?? "",
        from: formatAddress(env?.from),
        to: formatAddress(env?.to),
        date: toIsoDate(msg.internalDate),
        flags: flagsToArray(msg.flags),
        text: raw
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function deleteMessage(cfg: ServerInfo, mailbox: string, uid: number): Promise<boolean> {
  const client = clientFromConfig(cfg);
  await client.connect();
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      await client.messageDelete(uid.toString(), { uid: true });
      return true
    } finally {
      lock.release();
    }
  } catch {
    return false;
  } finally {
    await client.logout().catch(() => {});
  }
}
