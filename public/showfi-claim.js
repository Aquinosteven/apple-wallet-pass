(function () {
  var MAX_WAIT_SECONDS = 120;

  function normalizeText(value) {
    if (typeof value !== "string") return "";
    return value.trim();
  }

  function getToken(container) {
    var dataToken = (container.dataset && container.dataset.token) || container.getAttribute("data-token") || "";
    if (dataToken) return String(dataToken).trim();

    var params = new URLSearchParams(window.location.search || "");
    return (params.get("showfi_claim") || "").trim();
  }

  function getSessionToken(container) {
    var dataToken = (container.dataset && container.dataset.sessionToken) || container.getAttribute("data-session-token") || "";
    if (dataToken) return String(dataToken).trim();

    var params = new URLSearchParams(window.location.search || "");
    return (params.get("showfi_session") || "").trim();
  }

  function renderFallback(container, message) {
    container.textContent = message || "Claim link unavailable";
    container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    container.style.fontSize = "14px";
    container.style.color = "#6b7280";
  }

  function renderButton(container, token) {
    var claimUrl = new URL("/claim/" + encodeURIComponent(token), window.location.origin).toString();
    var button = document.createElement("a");
    button.href = claimUrl;
    button.textContent = "Claim your pass";
    button.style.display = "inline-block";
    button.style.padding = "12px 18px";
    button.style.borderRadius = "10px";
    button.style.background = "#0f172a";
    button.style.color = "#ffffff";
    button.style.textDecoration = "none";
    button.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    button.style.fontSize = "14px";
    button.style.fontWeight = "600";

    container.innerHTML = "";
    container.appendChild(button);
  }

  function createStatusNode() {
    var wrap = document.createElement("div");
    wrap.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    wrap.style.fontSize = "14px";
    wrap.style.color = "#0f172a";

    var title = document.createElement("div");
    title.style.fontWeight = "600";
    title.style.marginBottom = "4px";
    title.textContent = "Generating your pass";

    var detail = document.createElement("div");
    detail.style.color = "#475569";
    detail.textContent = "Starting...";

    var linkWrap = document.createElement("div");
    linkWrap.style.marginTop = "8px";

    wrap.appendChild(title);
    wrap.appendChild(detail);
    wrap.appendChild(linkWrap);

    return {
      wrap: wrap,
      detail: detail,
      linkWrap: linkWrap,
    };
  }

  function statusMessage(elapsedSeconds) {
    var phase = elapsedSeconds % 4;
    var dots = phase === 0 ? "." : (phase === 1 ? ".." : (phase === 2 ? "..." : "...."));
    return "Generating pass" + dots;
  }

  function renderStatusLink(linkWrap, url) {
    if (!url) return;
    if (linkWrap.dataset.rendered === "1") return;
    linkWrap.dataset.rendered = "1";

    var text = document.createElement("span");
    text.style.color = "#475569";
    text.textContent = "Need a fallback? ";

    var link = document.createElement("a");
    link.href = url;
    link.textContent = "Open status page";
    link.style.color = "#0f172a";

    linkWrap.appendChild(text);
    linkWrap.appendChild(link);
  }

  function adaptiveDelay(elapsedSeconds) {
    if (elapsedSeconds < 4) return 1;
    if (elapsedSeconds < 12) return 2;
    return 5;
  }

  async function pollEmbedStatus(container, sessionToken) {
    var ui = createStatusNode();
    container.innerHTML = "";
    container.appendChild(ui.wrap);

    var startedAt = Date.now();

    async function tick() {
      var elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      ui.detail.textContent = statusMessage(elapsedSeconds);

      if (elapsedSeconds >= MAX_WAIT_SECONDS) {
        ui.detail.textContent = "Still processing. Open the status page to continue.";
        return;
      }

      var response;
      try {
        response = await fetch("/api/embed/status?token=" + encodeURIComponent(sessionToken), {
          method: "GET",
          headers: { "Accept": "application/json" },
          credentials: "omit",
        });
      } catch (error) {
        var retryIn = adaptiveDelay(elapsedSeconds);
        window.setTimeout(tick, retryIn * 1000);
        return;
      }

      var payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (payload && payload.claimUrl) {
        var button = document.createElement("a");
        button.href = payload.claimUrl;
        button.textContent = "Open your pass";
        button.style.display = "inline-block";
        button.style.padding = "12px 18px";
        button.style.borderRadius = "10px";
        button.style.background = "#0f172a";
        button.style.color = "#ffffff";
        button.style.textDecoration = "none";
        button.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        button.style.fontSize = "14px";
        button.style.fontWeight = "600";
        container.innerHTML = "";
        container.appendChild(button);
        return;
      }

      if (payload && payload.showStatusPageLink && payload.statusPageUrl) {
        renderStatusLink(ui.linkWrap, payload.statusPageUrl);
      }

      if (payload && payload.status === "failed") {
        ui.detail.textContent = payload.error || "Generation failed. Open status page for details.";
        if (payload.statusPageUrl) renderStatusLink(ui.linkWrap, payload.statusPageUrl);
        return;
      }

      var nextDelay = payload && Number(payload.nextPollSeconds) > 0
        ? Number(payload.nextPollSeconds)
        : adaptiveDelay(elapsedSeconds);

      window.setTimeout(tick, nextDelay * 1000);
    }

    tick();
  }

  function init() {
    var container = document.getElementById("showfi-claim");
    if (!container) return;

    var sessionToken = normalizeText(getSessionToken(container));
    if (sessionToken) {
      pollEmbedStatus(container, sessionToken);
      return;
    }

    var token = getToken(container);
    if (!token) {
      renderFallback(container, "Claim link unavailable");
      return;
    }

    renderButton(container, token);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
