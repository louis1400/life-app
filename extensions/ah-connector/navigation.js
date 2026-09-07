// tabs.update/reload resolve before navigation finishes. Wait for a new loading
// cycle before inspecting controls, especially when reconciling a prior click.
export function navigate(tabId, update = null) {
  return new Promise((resolve, reject) => {
    let started = false;
    const finish = error => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(changed);
      chrome.tabs.onRemoved.removeListener(removed);
      if (error) reject(error); else resolve();
    };
    const changed = (id, change) => {
      if (id !== tabId) return;
      if (change.status === "loading") started = true;
      if (started && change.status === "complete") finish();
    };
    const removed = id => { if (id === tabId) finish(new Error("The AH tab was closed. Check your basket before retrying.")); };
    const timer = setTimeout(() => finish(new Error("AH did not finish loading. Check its tab before retrying.")), 15_000);
    chrome.tabs.onUpdated.addListener(changed);
    chrome.tabs.onRemoved.addListener(removed);
    const action = update ? chrome.tabs.update(tabId, update) : chrome.tabs.reload(tabId);
    action.catch(finish);
  });
}
