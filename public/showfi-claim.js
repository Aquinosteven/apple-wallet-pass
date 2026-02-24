(function () {
  function getToken(container) {
    var dataToken = (container.dataset && container.dataset.token) || container.getAttribute("data-token") || "";
    if (dataToken) return String(dataToken).trim();

    var params = new URLSearchParams(window.location.search || "");
    return (params.get("showfi_claim") || "").trim();
  }

  function renderFallback(container) {
    container.textContent = "Claim link unavailable";
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

  function init() {
    var container = document.getElementById("showfi-claim");
    if (!container) return;

    var token = getToken(container);
    if (!token) {
      renderFallback(container);
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
