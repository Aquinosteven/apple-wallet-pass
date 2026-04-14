import { rejectDisallowedOrigin, setJsonCors } from "../lib/apiAuth.js";
import { readJsonBodyStrict, isValidEmail } from "../lib/requestValidation.js";
import { getAccessContext, resolveOwnerScope } from "../lib/threadCAccess.js";
import { writeAuditLog } from "../lib/auditLog.js";
import { sendSupportEmail } from "../lib/mailProvider.js";
import { captureMonitoringError } from "../lib/monitoring.js";

function sanitizeText(value, max = 2000) {
  return String(value || "").trim().slice(0, max);
}

function validateTicketInput(input) {
  const payload = input && typeof input === "object" ? input : {};
  const requesterName = sanitizeText(payload.requesterName, 120);
  const requesterEmail = sanitizeText(payload.requesterEmail, 320);
  const subject = sanitizeText(payload.subject, 200);
  const message = sanitizeText(payload.message, 4000);

  if (!requesterName) return { ok: false, error: "requesterName is required" };
  if (!isValidEmail(requesterEmail)) return { ok: false, error: "requesterEmail must be valid" };
  if (!subject) return { ok: false, error: "subject is required" };
  if (!message) return { ok: false, error: "message is required" };

  return { ok: true, value: { requesterName, requesterEmail, subject, message } };
}

export function createSupportHandler(deps = {}) {
  const getAccessContextImpl = deps.getAccessContext || getAccessContext;
  const resolveOwnerScopeImpl = deps.resolveOwnerScope || resolveOwnerScope;
  const writeAuditLogImpl = deps.writeAuditLog || writeAuditLog;
  const sendSupportEmailImpl = deps.sendSupportEmail || sendSupportEmail;

  return async function handler(req, res) {
    const cors = setJsonCors(req, res, ["GET", "POST", "OPTIONS"]);
    if (req.method === "OPTIONS") return cors.originAllowed
      ? res.status(204).end()
      : res.status(403).json({ ok: false, error: "Origin not allowed" });
    if (rejectDisallowedOrigin(res, cors)) return;
    if (!["GET", "POST"].includes(req.method || "")) {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    try {
      const access = await getAccessContextImpl(req);
      if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
      const supabase = access.context.supabase;

      if (req.method === "GET") {
        const ownerUserId = resolveOwnerScopeImpl(access.context, req.query?.ownerUserId);
        let query = supabase
          .from("support_tickets")
          .select("id,owner_user_id,requester_name,requester_email,subject,message,status,metadata,created_at,updated_at")
          .order("created_at", { ascending: false })
          .limit(100);
        if (ownerUserId) query = query.eq("owner_user_id", ownerUserId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        return res.status(200).json({ ok: true, tickets: data || [] });
      }

      const parsedBody = await readJsonBodyStrict(req);
      if (!parsedBody.ok) return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
      const validated = validateTicketInput(parsedBody.body);
      if (!validated.ok) return res.status(400).json({ ok: false, error: validated.error });

      const ownerUserId = resolveOwnerScopeImpl(access.context, parsedBody.body?.ownerUserId) || access.context.user.id;
      const insertPayload = {
        owner_user_id: ownerUserId,
        requester_name: validated.value.requesterName,
        requester_email: validated.value.requesterEmail,
        subject: validated.value.subject,
        message: validated.value.message,
        metadata: {
          source: "support_form",
          role: access.context.role,
        },
      };

      const { data: created, error: createError } = await supabase
        .from("support_tickets")
        .insert(insertPayload)
        .select("id,owner_user_id,requester_name,requester_email,subject,message,status,metadata,created_at")
        .single();
      if (createError) return res.status(500).json({ ok: false, error: createError.message });

      const mailSubject = `[ShowFi Support] ${created.subject}`;
      const mailText = [
        `Ticket ID: ${created.id}`,
        `Owner User: ${created.owner_user_id}`,
        `Requester: ${created.requester_name} <${created.requester_email}>`,
        "",
        created.message,
      ].join("\n");
      const mailResult = await sendSupportEmailImpl({
        subject: mailSubject,
        text: mailText,
        ticketId: created.id,
        requesterEmail: created.requester_email,
      });
      if (!mailResult.ok) {
        await supabase
          .from("support_tickets")
          .update({
            status: "open",
            metadata: {
              ...(created.metadata || {}),
              mail_error: mailResult.error,
            },
          })
          .eq("id", created.id);
      }

      await writeAuditLogImpl(supabase, {
        actorUserId: access.context.user.id,
        ownerUserId,
        action: "support.ticket.create",
        targetType: "support_ticket",
        targetId: created.id,
        metadata: {
          subject: created.subject,
          mailOk: mailResult.ok,
          mailProvider: mailResult.provider || process.env.MAIL_PROVIDER || "log",
        },
      });

      return res.status(201).json({
        ok: true,
        ticket: created,
        mail: {
          ok: mailResult.ok,
          provider: mailResult.provider || process.env.MAIL_PROVIDER || "log",
          error: mailResult.ok ? null : mailResult.error,
        },
      });
    } catch (error) {
      captureMonitoringError(error, { endpoint: "/api/support" });
      return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  };
}

export default createSupportHandler();
