import fs from "fs";
import path from "path";

export type ServerInfo = {
  server: { port: number };
  gmail: {
    user: string;
    appPassword: string;
    imap: { host: string; port: number; secure: boolean };
    smtp: { host: string; port: number; secure: boolean };
  };
};

export function loadConfig(): ServerInfo {
  const p = path.resolve(process.cwd(), "serverInfo.json");
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw) as ServerInfo;
}
