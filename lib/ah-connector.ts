export type AHLine = { productId: string; quantity: number };
export type AHTransfer = {
  id: string;
  status: "running" | "complete" | "interrupted";
  message?: string;
  lines: { productId: string; requested: number; verified: boolean; before?: number; after?: number }[];
};
export type AHConnectionState = {
  status: "connected" | "disconnected" | "needs_login" | "unknown" | "closed" | "busy" | "error";
  message?: string;
  transfer?: AHTransfer | null;
};
export function requestAH(command: "status" | "connect" | "disconnect" | "transfer", lines?: AHLine[]): Promise<AHConnectionState> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timeout = command === "transfer" ? 260_000 : command === "connect" ? 18_000 : 2500;
    const cleanup = () => { clearTimeout(timer); window.removeEventListener("message", receive); };
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin || event.data?.channel !== "life-app:ah:v1" ||
          event.data?.direction !== "response" || event.data?.id !== id) return;
      const result = event.data.result as AHConnectionState;
      if (!result || !["connected", "disconnected", "needs_login", "unknown", "closed", "busy", "error"].includes(result.status)) return;
      cleanup(); resolve(result);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(command === "transfer"
        ? "The transfer could not be confirmed. Check your AH basket before retrying."
        : "The connector wasn't found in this browser. Install it, then reload life-app."));
    }, timeout);
    window.addEventListener("message", receive);
    window.postMessage({channel:"life-app:ah:v1", direction:"request", id, command, lines}, window.location.origin);
  });
}
