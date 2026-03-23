// api/client-pass.js
// Back-compat shim: historically the UI called /api/client-pass.
// Canonical endpoint is /api/pass.

import passHandler from "./pass.js";

export default function handler(req, res) {
  // Delegate to the real handler
  return passHandler(req, res);
}
