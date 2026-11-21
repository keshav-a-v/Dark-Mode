const PREFIX = "dark:";

function keyFor(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? PREFIX + u.hostname : null;
  } catch {
    return null;
  }
}

chrome.action.setBadgeBackgroundColor({ color: "#444" });

// Toolbar click or the Alt+Shift+D shortcut (_execute_action) lands here.
chrome.action.onClicked.addListener(async (tab) => {
  const key = keyFor(tab.url || "");
  if (tab.id == null || !key) return;

  try {
    // Tabs opened before install/reload won't have the content script yet.
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "ping" });
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
    }

    const { [key]: on } = await chrome.storage.local.get(key);
    if (on) await chrome.storage.local.remove(key);
    else await chrome.storage.local.set({ [key]: true });
  } catch (err) {
    console.warn("Quick Dark Toggle: could not toggle this page.", err);
  }
});

// Content scripts report their state so the badge reflects each tab.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === "state" && sender.tab?.id != null) {
    chrome.action.setBadgeText({ tabId: sender.tab.id, text: msg.on ? "ON" : "" });
  }
});