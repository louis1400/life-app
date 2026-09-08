export const SITE_ORIGIN = "https://life-app-louis.louis-nijholt.chatgpt.site";
export const AH_BASKET = "https://www.ah.nl/mijnlijst";
export const CHANNEL = "life-app:ah:v1";
export const COMMANDS = new Set(["status", "connect", "disconnect", "transfer", "add_one"]);

export function allowedSender(sender) {
  try {
    return sender.frameId === 0 && Number.isInteger(sender.tab?.id) &&
      new URL(sender.url).origin === SITE_ORIGIN;
  } catch { return false; }
}

export function normalizeLines(input, catalog) {
  if (!Array.isArray(input) || input.length === 0 || input.length > catalog.length) {
    throw new Error("Choose at least one of your essentials to send to AH.");
  }
  const seen = new Set();
  return input.map(line => {
    const product = catalog.find(p => p.id === line?.productId);
    if (!product || seen.has(product.id) || !Number.isSafeInteger(line.quantity) ||
        line.quantity < 1 || line.quantity > 99) {
      throw new Error("Use each selected product once, with 1–99 packs.");
    }
    seen.add(product.id);
    // Never accept a URL, selector, code, or product name supplied by the page.
    return { productId: product.id, quantity: line.quantity, url: product.url, name: product.name };
  });
}

export function remainingQuantity(current, target) {
  if (!Number.isSafeInteger(current) || current < 0 || current > 99 ||
      !Number.isSafeInteger(target) || target < 1 || target > 99) {
    throw new Error("AH's quantity could not be read. Check the basket before continuing.");
  }
  return Math.max(0, target - current);
}
