chrome.action.onClicked.addListener((tab) => {
  if (!tab.id || !/^https?:/.test(tab.url || "")) return;
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const ID = "quick-dark-toggle-style";
      const existing = document.getElementById(ID);
      if (existing) {
        existing.remove();
        return;
      }
      const f = "invert(1) hue-rotate(180deg)";
      const s = document.createElement("style");
      s.id = ID;
      s.textContent =
        `html { filter: ${f} !important; background: #fff; }` +
        ` img, video { filter: ${f} !important; }`;
      document.documentElement.appendChild(s);
    },
  });
});
