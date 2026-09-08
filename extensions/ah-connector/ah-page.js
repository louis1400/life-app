// These self-contained functions run in Chrome's isolated content-script world.
// They inspect visible controls only. No cookies, login fields, network calls,
// application internals, or tokens are read or exported.
export function inspectConnection() {
  const visible = el => !!el && !!el.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
  if (location.origin !== "https://www.ah.nl") return { status: "needs_login" };
  if (visible(document.querySelector('button[aria-label="Inloggen"]'))) return { status: "needs_login" };
  if (!visible(document.querySelector('button[aria-label="Mijn account"]'))) return { status: "unknown" };
  return { status: "connected" };
}

export function inspectBasket() {
  const visible = el => !!el && !!el.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
  const name = el => (el.getAttribute("aria-label") || el.textContent || "").trim();
  if (location.origin !== "https://www.ah.nl" || location.pathname !== "/mijnlijst") return { ready: false };
  const main = document.querySelector("main");
  const heading = main?.querySelector("h1");
  const buttons = Array.from(main?.querySelectorAll("button") || []).filter(visible);
  const ordinaryBasket = visible(heading) && heading.textContent.trim() === "Winkelmandje" &&
    buttons.some(b => name(b) === "Online bestellen");
  // A saved order being edited must never be mistaken for a new basket.
  const editingOrder = /(?:je|jouw) bestelling (?:wijzigen|aanpassen)|bestelling (?:afronden|bevestigen)|wijzigingen (?:opslaan|bevestigen)/i.test(main?.innerText || "");
  return { ready: ordinaryBasket && !editingOrder };
}

export function inspectProduct(productId, increment = false, expectedQuantity = null) {
  const visible = el => !!el && !!el.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
  const name = el => (el.getAttribute("aria-label") || el.textContent || "").trim();
  if (location.origin !== "https://www.ah.nl" ||
      location.pathname.match(/^\/producten\/product\/(wi\d+)(?:\/|$)/)?.[1] !== productId) {
    return { status: "wrong_page" };
  }
  if (!visible(document.querySelector('button[aria-label="Mijn account"]'))) return { status: "needs_login" };
  // Consent, login, verification and other dialogs need the user's attention.
  if (Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]')).some(visible)) {
    return { status: "attention" };
  }
  const consentPrompt = Array.from(document.querySelectorAll("button")).some(b =>
    visible(b) && ["Weigeren", "Accepteren", "Zelf instellen"].includes(name(b)));
  const challenge = Array.from(document.querySelectorAll("iframe")).some(frame =>
    visible(frame) && /captcha|challenge|verification/i.test(frame.getAttribute("title") || frame.getAttribute("src") || ""));
  if (consentPrompt || challenge) return { status: "attention" };
  const articles = Array.from(document.querySelectorAll("main article")).filter(el => visible(el.querySelector("h1")));
  if (articles.length !== 1) return { status: "unknown" };
  const article = articles[0];
  const inputs = Array.from(article.querySelectorAll('input[type="number"]')).filter(visible);
  const buttons = Array.from(article.querySelectorAll("button")).filter(visible);
  const add = buttons.filter(b => name(b) === "Voeg toe");
  const increase = buttons.filter(b => name(b) === "Verhoog");
  let quantity;
  let control;
  if (inputs.length === 1 && /^\d+$/.test(inputs[0].value)) {
    quantity = Number(inputs[0].value);
    control = increase.length === 1 ? increase[0] : null;
  } else if (inputs.length === 0 && add.length === 1) {
    quantity = 0;
    control = add[0];
  } else return { status: "unavailable" };
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 99) return { status: "unknown" };
  if (increment) {
    if (quantity !== expectedQuantity) return { status: "changed", quantity };
    if (!control || control.disabled || control.getAttribute("aria-disabled") === "true" || quantity >= 99) {
      return { status: "unavailable", quantity };
    }
    // Only these two explicitly identified quantity controls can be clicked.
    // Checkout, delete, delivery, login and payment controls have no code path.
    control.click();
    return { status: "clicked", quantity };
  }
  return { status: "ready", quantity };
}
