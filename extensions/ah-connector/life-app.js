(() => {
  const origin = "https://life-app-louis.louis-nijholt.chatgpt.site";
  const channel = "life-app:ah:v1";
  const commands = new Set(["status", "connect", "disconnect", "transfer"]);
  window.addEventListener("message", async event => {
    if (event.source !== window || event.origin !== origin ||
        event.data?.channel !== channel || event.data?.direction !== "request" ||
        typeof event.data.id !== "string" || !/^[a-f0-9-]{36}$/i.test(event.data.id) ||
        !commands.has(event.data.command)) return;
    const { id, command, lines } = event.data;
    let result;
    try {
      result = await chrome.runtime.sendMessage({ channel, id, command, lines });
    } catch {
      result = { status: "error", message: "The connector stopped responding. Reload life-app and check your AH basket before retrying." };
    }
    window.postMessage({ channel, direction: "response", id, result }, origin);
  });
})();
