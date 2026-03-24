Practice M6 – MailBag Server (Chapter 8-style) – Gmail IMAP/SMTP

This project is a server-side component for a simple webmail system.
It exposes REST endpoints that wrap Gmail IMAP (read/list/search) and SMTP (send).

Gmail auth
- Recommended: enable Google 2-Step Verification, then create a Gmail App Password.
  App passwords require 2-Step Verification. See Google Account Help.
- Gmail also supports OAuth2 for IMAP/SMTP, but App Password is faster for this assignment.

Setup:
1) npm install
```bash
npm install
```
2) Update serverInfo.json:
   - gmail.user
   - gmail.appPassword (use an App Password, not your normal password)
3) Run:
   - npm run build
   - npm run start
```bash
npm run build
```
```bash
npm start
```

Server starts on http://localhost:8080

REST
- GET    /health
- GET    /mailboxes
- GET    /mailboxes/:mailbox/messages?limit=20&offset=0&query=...
         Extra feature: pagination + search via query
- GET    /mailboxes/:mailbox/messages/:uid
- DELETE /mailboxes/:mailbox/messages/:uid
- POST   /send  { from, to, subject, text, html? }

Quick curl tests
- curl http://localhost:8080/health
- curl http://localhost:8080/mailboxes
- curl "http://localhost:8080/mailboxes/INBOX/messages?limit=10&offset=0"
