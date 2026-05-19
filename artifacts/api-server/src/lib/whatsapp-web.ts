import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import fs from "node:fs/promises";
import path from "node:path";

export type WhatsAppWebConnectionState = "idle" | "connecting" | "qr" | "connected" | "error";

type StatusSnapshot = {
  state: WhatsAppWebConnectionState;
  connected: boolean;
  qrAvailable: boolean;
  qrImageDataUrl: string | null;
  lastError: string | null;
};

let socket: ReturnType<typeof makeWASocket> | null = null;
let state: WhatsAppWebConnectionState = "idle";
let lastError: string | null = null;
let qrImageDataUrl: string | null = null;
let connectPromise: Promise<void> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let autoStartAttempted = false;
let manualDisconnectInProgress = false;

const authDir = path.resolve(process.cwd(), ".wa-auth");

async function clearAuthSession() {
  try {
    await fs.rm(authDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors to avoid blocking connection state transitions.
  }
}

function toStatusSnapshot(): StatusSnapshot {
  return {
    state,
    connected: state === "connected",
    qrAvailable: Boolean(qrImageDataUrl),
    qrImageDataUrl,
    lastError,
  };
}

async function createSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  state = "connecting";
  lastError = null;
  qrImageDataUrl = null;

  const { state: authState, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const waSocket = makeWASocket({
    auth: authState,
    version,
    browser: ["Revo Store", "Chrome", "1.0.0"],
    // Avoid init history queries that intermittently return bad-request on some WA Web sessions.
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    // Baileys 7 RC may emit `unexpected error in 'init queries'` on some accounts; disable those startup queries.
    fireInitQueries: false,
  });

  waSocket.ev.on("creds.update", saveCreds);

  waSocket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      state = "qr";
      try {
        qrImageDataUrl = await QRCode.toDataURL(qr);
      } catch {
        qrImageDataUrl = null;
      }
    }

    if (connection === "open") {
      state = "connected";
      lastError = null;
      qrImageDataUrl = null;
    }

    if (connection === "close") {
      socket = null;
      if (manualDisconnectInProgress) {
        manualDisconnectInProgress = false;
        state = "idle";
        lastError = null;
        qrImageDataUrl = null;
        return;
      }
      const disconnectMessage =
        (lastDisconnect?.error as any)?.message ||
        (lastDisconnect?.error as any)?.toString?.() ||
        "";
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const conflictDisconnect = /conflict|replaced/i.test(String(disconnectMessage));

      if (loggedOut) {
        state = "idle";
        lastError = "تم تسجيل خروج جلسة واتساب. امسح QR مرة أخرى.";
      } else if (conflictDisconnect) {
        state = "error";
        lastError = "تم إنهاء جلسة واتساب بسبب تعارض جهاز آخر. أغلق الجلسات الأخرى ثم أعد الربط.";
      } else {
        state = "connecting";
        lastError = "انقطع الاتصال، تتم إعادة المحاولة تلقائيًا...";
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            void startWhatsAppWebConnection();
          }, 2000);
        }
      }
    }
  });

  socket = waSocket;
}

export async function startWhatsAppWebConnection() {
  if (state === "connected") return toStatusSnapshot();

  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        await createSocket();
      } catch (error) {
        state = "error";
        lastError = error instanceof Error ? error.message : "فشل ربط واتساب ويب";
        socket = null;
      } finally {
        connectPromise = null;
      }
    })();
  }

  await connectPromise;
  return toStatusSnapshot();
}

export async function refreshWhatsAppWebQr() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  connectPromise = null;
  qrImageDataUrl = null;
  lastError = null;
  state = "idle";

  if (socket) {
    manualDisconnectInProgress = true;
    const activeSocket = socket as any;
    try {
      activeSocket.ws?.close?.();
    } catch {
      // Ignore close errors and continue with a clean reconnect attempt.
    }
    try {
      activeSocket.end?.(new Error("Manual QR refresh"));
    } catch {
      // Ignore end errors and continue.
    }
    socket = null;
  }

  await clearAuthSession();

  return startWhatsAppWebConnection();
}

export function getWhatsAppWebStatus() {
  return toStatusSnapshot();
}

export function ensureWhatsAppWebAutoStart() {
  const autoStartEnabled = (process.env["WHATSAPP_WEB_AUTOSTART"] ?? "true").toLowerCase();
  if (autoStartEnabled === "false" || autoStartEnabled === "0" || autoStartEnabled === "off") {
    state = "idle";
    lastError = null;
    qrImageDataUrl = null;
    return;
  }

  if (autoStartAttempted) return;
  autoStartAttempted = true;
  void startWhatsAppWebConnection();
}

export async function disconnectWhatsAppWeb() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  connectPromise = null;
  qrImageDataUrl = null;
  lastError = null;

  if (socket) {
    manualDisconnectInProgress = true;
    const activeSocket = socket as any;
    try {
      activeSocket.ws?.close?.();
    } catch {
      // Ignore close errors.
    }
    try {
      activeSocket.end?.(new Error("Manual disconnect"));
    } catch {
      // Ignore end errors.
    }
    socket = null;
  }

  await clearAuthSession();

  state = "idle";
  return toStatusSnapshot();
}

function normalizePhoneForJid(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits) throw new Error("رقم الهاتف غير صالح");
  return `${digits}@s.whatsapp.net`;
}

export async function sendWhatsAppWebMessage(input: { to: string; message: string }) {
  if (!socket || state !== "connected") {
    throw new Error("واتساب غير متصل. امسح QR أولاً.");
  }

  const jid = normalizePhoneForJid(input.to);
  await socket.sendMessage(jid, { text: input.message });
  return { success: true as const };
}
