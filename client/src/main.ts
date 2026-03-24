import {
  health,
  listMailboxes,
  listMessages,
  getMessage,
  deleteMessage,
  send,
} from "./api";

const status = document.getElementById("status")!;
const mailboxList = document.getElementById("mailboxList")!;
const messageList = document.getElementById("messageList")!;
const messageView = document.getElementById("messageView")!;
const messageMeta = document.getElementById("messageMeta")!;
const mailboxTitle = document.getElementById("mailboxTitle")!;

const searchBox = document.getElementById("searchBox") as HTMLInputElement;
const prevBtn = document.getElementById("prevBtn") as HTMLButtonElement;
const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
const deleteBtn = document.getElementById("deleteBtn") as HTMLButtonElement;

const toInput = document.getElementById("to") as HTMLInputElement;
const subjectInput = document.getElementById("subject") as HTMLInputElement;
const bodyInput = document.getElementById("body") as HTMLTextAreaElement;
const sendBtn = document.getElementById("sendBtn") as HTMLButtonElement;

const FROM_EMAIL = "muskan20mehrotra@gmail.com";

let currentMailbox = "INBOX";
let currentOffset = 0;
const limit = 10;
let selectedUid: number | null = null;
let searchDebounce: number | undefined;

deleteBtn.disabled = true;

function clearSelectedMessages() {
  messageList.querySelectorAll("li.selected").forEach((el) => {
    el.classList.remove("selected");
  });
}

function setStatus(text: string, state: "connected" | "disconnected" | "loading" = "loading") {
  status.textContent = text;
  status.className = "status-pill";
  if (state === "connected") status.classList.add("connected");
  if (state === "disconnected") status.classList.add("disconnected");
}

function setActiveMailbox(name: string) {
  mailboxTitle.textContent = name;
  mailboxList.querySelectorAll("li").forEach((el) => {
    el.classList.toggle("active", el.textContent === name);
  });
}

function escapeHtml(value: string = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value?: string) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function resetMessagePreview() {
  messageMeta.textContent = "Select a message to preview it here.";
  messageMeta.className = "message-meta empty-state";
  messageView.textContent = "(select a message)";
}

async function init() {
  try {
    setStatus("Connecting...");
    const h = await health();
    setStatus(h.ok ? "Connected" : "Error", h.ok ? "connected" : "disconnected");

    const m = await listMailboxes();
    const mailboxes = m.mailboxes ?? m ?? [];

    mailboxList.innerHTML = "";

    mailboxes.forEach((mb: any) => {
      const li = document.createElement("li");
      const name = mb.path ?? mb;
      li.textContent = name;

      li.onclick = () => {
        currentMailbox = name;
        currentOffset = 0;
        selectedUid = null;
        deleteBtn.disabled = true;
        resetMessagePreview();
        setActiveMailbox(name);
        loadMessages();
      };

      mailboxList.appendChild(li);
    });

    setActiveMailbox(currentMailbox);
    await loadMessages();
  } catch (e) {
    console.error(e);
    setStatus("Disconnected", "disconnected");
  }
}

async function loadMessages() {
  const q = searchBox.value.trim();
  messageList.innerHTML = `<li class="empty-state">Loading messages...</li>`;

  try {
    const res = await listMessages(
      currentMailbox,
      limit,
      currentOffset,
      q.length ? q : undefined
    );

    const items = (res.items ?? res.messages ?? []).sort((a: any, b: any) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return db - da;
    });

    messageList.innerHTML = "";

    if (!items.length) {
      messageList.innerHTML = `<li class="empty-state">No messages found in ${escapeHtml(currentMailbox)}.</li>`;
    }

    items.forEach((msg: any) => {
      const li = document.createElement("li");
      const subject = msg.subject || "(no subject)";
      const from = msg.from || "Unknown sender";
      const snippet = msg.text || msg.preview || "Open the message to read more.";

      li.innerHTML = `
        <div class="message-subject">${escapeHtml(subject)}</div>
        <div class="message-from">${escapeHtml(from)}</div>
        <div class="message-date">${escapeHtml(formatDate(msg.date))}</div>
        <div class="message-snippet">${escapeHtml(String(snippet).slice(0, 110))}</div>
      `;

      li.onclick = async () => {
        clearSelectedMessages();
        li.classList.add("selected");
        selectedUid = msg.uid;
        deleteBtn.disabled = false;
        await openMessage(msg.uid, msg);
      };

      messageList.appendChild(li);
    });

    prevBtn.disabled = currentOffset <= 0;
    nextBtn.disabled = items.length < limit;
  } catch (e) {
    console.error(e);
    messageList.innerHTML = `<li class="empty-state">Could not load messages.</li>`;
  }
}

async function openMessage(uid: number, summary?: any) {
  messageMeta.className = "message-meta";
  messageMeta.innerHTML = `
    <strong>From:</strong> ${escapeHtml(summary?.from || "Unknown sender")}<br>
    <strong>Subject:</strong> ${escapeHtml(summary?.subject || "(no subject)")}<br>
    <strong>Date:</strong> ${escapeHtml(formatDate(summary?.date))}
  `;
  messageView.textContent = "Loading message...";

  const m = await getMessage(currentMailbox, uid);
  messageView.textContent = m.text || m.html || m.raw || JSON.stringify(m, null, 2);
}

searchBox.addEventListener("input", () => {
  window.clearTimeout(searchDebounce);
  searchDebounce = window.setTimeout(() => {
    currentOffset = 0;
    loadMessages();
  }, 250);
});

prevBtn.addEventListener("click", () => {
  currentOffset = Math.max(0, currentOffset - limit);
  loadMessages();
});

nextBtn.addEventListener("click", () => {
  currentOffset += limit;
  loadMessages();
});

deleteBtn.addEventListener("click", async () => {
  if (selectedUid == null) {
    alert("Select a message first.");
    return;
  }

  const ok = confirm("Delete this email?");
  if (!ok) return;

  try {
    await deleteMessage(currentMailbox, selectedUid);
    selectedUid = null;
    deleteBtn.disabled = true;
    resetMessagePreview();
    await loadMessages();
  } catch (e: any) {
    console.error(e);
    alert("Delete failed: " + (e?.message ?? e));
  }
});

sendBtn.addEventListener("click", async () => {
  const payload = {
    from: FROM_EMAIL,
    to: toInput.value.trim(),
    subject: subjectInput.value.trim(),
    text: bodyInput.value,
  };

  if (!payload.to || !payload.subject || !payload.text) {
    alert("Fill To, Subject, and Message");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";

  try {
    await send(payload);
    alert("Email sent!");
    toInput.value = "";
    subjectInput.value = "";
    bodyInput.value = "";
  } catch (e: any) {
    console.error(e);
    alert("Send failed: " + (e?.message ?? e));
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
  }
});

resetMessagePreview();
init();
