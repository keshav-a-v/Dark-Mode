(() => {
  // Guard against double injection (manifest + fallback injection from background).
  if (window.__quickDarkToggleLoaded) return;
  window.__quickDarkToggleLoaded = true;

  const STYLE_ID = "quick-dark-toggle-style";
  const KEY = "dark:" + location.hostname;
  const FLIP = "invert(1) hue-rotate(180deg)";

  // Sites that draw their actual content on <canvas> (Docs pages, Sheets grid).
  // Here the canvas must stay inverted with the page, otherwise the document
  // and cells would remain bright white.
  const CANVAS_IS_CONTENT_HOSTS = ["docs.google.com"];
  const canvasIsContent = CANVAS_IS_CONTENT_HOSTS.some(
    (h) => location.hostname === h || location.hostname.endsWith("." + h)
  );

  // Elements re-inverted so they keep their original colors.
  const MEDIA = canvasIsContent
    ? "img, video, embed, object"
    : "img, video, canvas, embed, object";

  // Google Slides draws slides as SVG; keep photos inside them natural.
  const SLIDES_IMAGES =
    location.hostname === "docs.google.com" &&
    location.pathname.startsWith("/presentation")
      ? ", svg image"
      : "";

  const CSS = `
    html {
      filter: ${FLIP} brightness(0.92) contrast(0.92) !important;
      background: #fff !important;
    }
    ${MEDIA}${SLIDES_IMAGES} {
      filter: ${FLIP} !important;
    }
    @media print {
      html, ${MEDIA}${SLIDES_IMAGES} { filter: none !important; }
    }
  `;

  let enabled = false;
  let observer = null;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.documentElement.appendChild(style);
  }

  // Some sites rewrite <head>/<html> children; put our style back if it vanishes.
  function watch() {
    if (observer) return;
    observer = new MutationObserver(() => {
      if (enabled) ensureStyle();
    });
    observer.observe(document.documentElement, { childList: true });
  }

  function unwatch() {
    observer?.disconnect();
    observer = null;
  }

  function report() {
    try {
      if (!chrome.runtime?.id) return; // extension was reloaded/updated
      chrome.runtime.sendMessage({ type: "state", on: enabled }).catch(() => {});
    } catch {
      /* context invalidated */
    }
  }

  function apply(on) {
    enabled = on;
    if (on) {
      ensureStyle();
      watch();
    } else {
      document.getElementById(STYLE_ID)?.remove();
      unwatch();
    }
    report();
  }

  // Initial state (persisted per hostname)
  chrome.storage.local
    .get(KEY)
    .then((res) => apply(Boolean(res[KEY])))
    .catch(() => {});

  // Stay in sync across tabs/windows of the same site
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && KEY in changes) apply(Boolean(changes[KEY].newValue));
  });

  // Lets the background worker check whether this script is already present
  chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    if (msg?.type === "ping") respond({ ok: true });
  });
})();