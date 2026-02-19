const sampleEvents = [
  {
    id: "evt_001",
    name: "Q2 Growth Webinar",
    date: "Apr 14, 2026",
    time: "2:00 PM",
    timezone: "America/New_York",
    description: "Live webinar covering retention and conversion tactics for Q2.",
    status: "draft",
    ticketPublished: false,
    ticketsIssued: 0,
    walletAdds: 0,
    checkIns: 0,
    lastIssuedAt: null,
  },
  {
    id: "evt_002",
    name: "Product Launch Summit",
    date: "May 3, 2026",
    time: "11:00 AM",
    timezone: "America/Los_Angeles",
    description: "Virtual summit for launch announcements, demos, and partner sessions.",
    status: "draft",
    ticketPublished: false,
    ticketsIssued: 0,
    walletAdds: 0,
    checkIns: 0,
    lastIssuedAt: null,
  },
  {
    id: "evt_003",
    name: "Customer Success Workshop",
    date: "May 20, 2026",
    time: "10:30 AM",
    timezone: "America/Chicago",
    description: "Hands-on training session for onboarding and adoption playbooks.",
    status: "draft",
    ticketPublished: false,
    ticketsIssued: 0,
    walletAdds: 0,
    checkIns: 0,
    lastIssuedAt: null,
  },
];

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method Not Allowed" });
  }

  return res.status(200).json(sampleEvents);
}
