function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function buildHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Webhook Mapping UI</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; color: #0f172a; }
    h1 { margin: 0 0 4px; }
    p { margin: 4px 0 12px; color: #475569; }
    .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; max-width: 860px; }
    .row { display: grid; grid-template-columns: 160px 1fr; gap: 12px; margin: 10px 0; align-items: center; }
    input, select { width: 100%; padding: 8px; border: 1px solid #94a3b8; border-radius: 8px; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; }
    .small { font-size: 12px; color: #64748b; }
    button { margin-top: 12px; padding: 10px 14px; border-radius: 10px; border: 1px solid #0f172a; background: #0f172a; color: #fff; }
  </style>
</head>
<body>
  <h1>No-Code Webhook Mapping</h1>
  <p>Required fields: <code>name</code>, <code>email</code>, <code>phone</code>, <code>joinLink</code>, <code>tier (GA/VIP)</code>.</p>

  <div class="card">
    <div class="row">
      <label for="endpointId">Endpoint ID</label>
      <input id="endpointId" placeholder="Webhook endpoint UUID" />
    </div>
    <div class="row">
      <label for="preset">Preset</label>
      <select id="preset">
        <option value="ghl">GoHighLevel</option>
        <option value="clickfunnels">ClickFunnels</option>
        <option value="generic" selected>Generic / Zapier</option>
        <option value="zapier">Zapier</option>
      </select>
    </div>
    <div class="row"><label>name</label><input id="namePath" placeholder="contact.name" /></div>
    <div class="row"><label>email</label><input id="emailPath" placeholder="contact.email" /></div>
    <div class="row"><label>phone</label><input id="phonePath" placeholder="contact.phone" /></div>
    <div class="row"><label>joinLink</label><input id="joinPath" placeholder="customData.joinLink" /></div>
    <div class="row"><label>tier (GA/VIP)</label><input id="tierPath" placeholder="customData.tier" /></div>
    <div class="small">Use dot notation (for example <code>contact.customData.joinLink</code>).</div>
    <button id="save">Save Mapping</button>
    <pre id="output" class="small"></pre>
  </div>

  <script>
    const output = document.getElementById('output');
    const query = new URLSearchParams(window.location.search);
    const endpointField = document.getElementById('endpointId');
    const endpointFromQuery = query.get('endpointId');
    if (endpointFromQuery) endpointField.value = endpointFromQuery;

    document.getElementById('save').addEventListener('click', () => {
      const payload = {
        preset: document.getElementById('preset').value,
        fieldPaths: {
          name: document.getElementById('namePath').value,
          email: document.getElementById('emailPath').value,
          phone: document.getElementById('phonePath').value,
          joinLink: document.getElementById('joinPath').value,
          tier: document.getElementById('tierPath').value,
        },
      };
      const endpointId = endpointField.value.trim();
      if (!endpointId) {
        output.textContent = 'endpointId is required.';
        return;
      }

      fetch('/api/webhooks/mappings?endpointId=' + encodeURIComponent(endpointId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          const body = await res.json().catch(() => ({}));
          output.textContent = JSON.stringify({
            status: res.status,
            ok: res.ok,
            response: body,
          }, null, 2);
        })
        .catch((error) => {
          output.textContent = JSON.stringify({ ok: false, error: String(error) }, null, 2);
        });
    });
  </script>
</body>
</html>`;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(buildHtml());
}
