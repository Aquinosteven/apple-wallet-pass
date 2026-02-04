import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateOnlineEventPass } from "../util/pass";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      eventName,
      eventDate,
      venueName,
      venueAddress,
      attendeeName,
      attendeeEmail,
    } = req.body || {};

    if (
      !eventName ||
      !eventDate ||
      !venueName ||
      !venueAddress ||
      !attendeeName
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const pkpassBuffer = await generateOnlineEventPass({
      eventName,
      eventDate,
      venueName,
      venueAddress,
      attendeeName,
      attendeeEmail,
    });

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="online-event.pkpass"'
    );

    return res.status(200).send(pkpassBuffer);
  } catch (err: any) {
    console.error("Online event
