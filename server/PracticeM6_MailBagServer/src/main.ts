/**
 * Practice M6 – MailBag Server (Chapter 8)
 *
 * REST API wrapping:
 * - IMAP: list mailboxes, list/search messages, fetch message, delete message
 * - SMTP: send message
 *
 * Extra feature (rubric): Search + pagination on message listing endpoint.
 */
import express from "express";
import cors from "cors";
import { loadConfig } from "./util/config.js";
import { listMailboxes, listMessages, getMessage, deleteMessage } from "./gmail/imap.js";
import { sendMail } from "./gmail/smtp.js";

const cfg = loadConfig();
const app = express();

app.use(cors());           // ✅ allow all origins for dev
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/mailboxes", async (_req, res) => {
  try {
    const boxes = await listMailboxes(cfg);
    res.json({ mailboxes: boxes });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to list mailboxes", details: String(e?.message ?? e) });
  }
});

app.get("/mailboxes/:mailbox/messages", async (req, res) => {
  const mailbox = req.params.mailbox;
  const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 20)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));
  const query = typeof req.query.query === "string" ? req.query.query : undefined;

  try {
    const result = await listMessages(cfg, mailbox, { limit, offset, query });
    res.json({ mailbox, ...result, limit, offset, query: query ?? null });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to list messages", details: String(e?.message ?? e) });
  }
});

app.get("/mailboxes/:mailbox/messages/:uid", async (req, res) => {
  const mailbox = req.params.mailbox;
  const uid = Number(req.params.uid);
  if (!Number.isFinite(uid)) return res.status(400).json({ error: "uid must be a number" });

  try {
    const msg = await getMessage(cfg, mailbox, uid);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    res.json(msg);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch message", details: String(e?.message ?? e) });
  }
});

app.delete("/mailboxes/:mailbox/messages/:uid", async (req, res) => {
  const mailbox = req.params.mailbox;
  const uid = Number(req.params.uid);
  if (!Number.isFinite(uid)) return res.status(400).json({ error: "uid must be a number" });

  try {
    const ok = await deleteMessage(cfg, mailbox, uid);
    if (!ok) return res.status(404).json({ error: "Message not found or could not be deleted" });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to delete message", details: String(e?.message ?? e) });
  }
});

app.post("/send", async (req, res) => {
  const { from, to, subject, text, html } = req.body ?? {};
  if (!from || !to || !subject || !text) {
    return res.status(400).json({ error: "Missing required fields: from, to, subject, text" });
  }

  try {
    const result = await sendMail(cfg, { from, to, subject, text, html });
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to send email", details: String(e?.message ?? e) });
  }
});

const port = Number(process.env.PORT ?? cfg.server.port ?? 8080);
app.listen(port, () => console.log(`MailBag server running on port ${port}`));
