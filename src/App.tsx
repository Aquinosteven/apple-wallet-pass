import { useMemo, useState } from "react";

type FormState = {
  organizationName: string;
  eventSeries: string;
  eventTitle: string;
  hostName: string;
  startDateTimeLocal: string;
  endDateTimeLocal: string;
  durationMinutes: string;
  timezone: string;
  joinLinkLabel: string;
  joinLinkUrl: string;
  agenda: string;
  supportText: string;
  fallbackText: string;
  recipientName: string;
  recipientEmail: string;
  seatOrTier: string;
  checkInCode: string;
  brandBackground: string;
  brandForeground: string;
  brandLabel: string;
  logoImage: string;
  stripImage: string;
  thumbnailImage: string;
  iconImage: string;
};

const defaultTimezone =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const initialState: FormState = {
  organizationName: "",
  eventSeries: "",
  eventTitle: "",
  hostName: "",
  startDateTimeLocal: "",
  endDateTimeLocal: "",
  durationMinutes: "60",
  timezone: defaultTimezone,
  joinLinkLabel: "Join Live Session",
  joinLinkUrl: "",
  agenda: "",
  supportText: "Questions? support@example.com",
  fallbackText: "Check your email for the link.",
  recipientName: "",
  recipientEmail: "",
  seatOrTier: "",
  checkInCode: "",
  brandBackground: "#202020",
  brandForeground: "#FFFFFF",
  brandLabel: "#FFFFFF",
  logoImage: "",
  stripImage: "",
  thumbnailImage: "",
  iconImage: "",
};

function App() {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [downloadName, setDownloadName] = useState<string | null>(null);

  const requiredFields = useMemo(
    () => [
      { key: "organizationName", label: "Organization name" },
      { key: "eventSeries", label: "Event series or program" },
      { key: "eventTitle", label: "Event title" },
      { key: "hostName", label: "Host or presenter" },
      { key: "startDateTimeLocal", label: "Start date/time" },
      { key: "timezone", label: "Time zone" },
      { key: "joinLinkLabel", label: "Join link label" },
      { key: "joinLinkUrl", label: "Join link URL" },
      { key: "recipientName", label: "Recipient name" },
      { key: "recipientEmail", label: "Recipient email" },
    ],
    []
  );

  const updateField = (key: keyof FormState, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleFile = async (key: keyof FormState, file: File | null) => {
    if (!file) {
      updateField(key, "");
      return;
    }

    if (file.type !== "image/png") {
      setErrors(["Please upload PNG images only."]);
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });

    updateField(key, dataUrl);
  };

  const buildPayload = () => {
    const startDate = formState.startDateTimeLocal
      ? new Date(formState.startDateTimeLocal)
      : null;
    const endDate = formState.endDateTimeLocal
      ? new Date(formState.endDateTimeLocal)
      : null;

    return {
      organizationName: formState.organizationName,
      eventSeries: formState.eventSeries,
      eventTitle: formState.eventTitle,
      hostName: formState.hostName,
      startDateTimeISO: startDate ? startDate.toISOString() : "",
      endDateTimeISO: endDate ? endDate.toISOString() : "",
      durationMinutes: formState.durationMinutes,
      timezone: formState.timezone,
      joinLinkLabel: formState.joinLinkLabel,
      joinLinkUrl: formState.joinLinkUrl,
      agenda: formState.agenda,
      supportText: formState.supportText,
      fallbackText: formState.fallbackText,
      recipientName: formState.recipientName,
      recipientEmail: formState.recipientEmail,
      seatOrTier: formState.seatOrTier,
      checkInCode: formState.checkInCode,
      brand: {
        backgroundColor: formState.brandBackground,
        foregroundColor: formState.brandForeground,
        labelColor: formState.brandLabel,
      },
      logoImage: formState.logoImage,
      stripImage: formState.stripImage,
      thumbnailImage: formState.thumbnailImage,
      iconImage: formState.iconImage,
    };
  };

  const validateClient = () => {
    const newErrors: string[] = [];

    requiredFields.forEach((field) => {
      const value = String(formState[field.key as keyof FormState] || "").trim();
      if (!value) newErrors.push(`${field.label} is required.`);
    });

    if (!formState.endDateTimeLocal && !formState.durationMinutes) {
      newErrors.push("Provide either an end date/time or a duration.");
    }

    if (formState.joinLinkUrl && !/^https?:\/\//i.test(formState.joinLinkUrl)) {
      newErrors.push("Join link URL must start with http:// or https://");
    }

    if (
      formState.recipientEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.recipientEmail)
    ) {
      newErrors.push("Recipient email must be valid.");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);
    setDownloadName(null);

    if (!validateClient()) return;

    setStatus("loading");

    try {
      const payload = buildPayload();
      const response = await fetch("/api/online-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setErrors(data?.errors || []);
        setServerError(data?.message || "Failed to generate pass.");
        setStatus("idle");
        return;
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      const filenameMatch = contentDisposition?.match(/filename="?([^\"]+)"?/i);
      const filename = filenameMatch?.[1] || "online-event.pkpass";
      setDownloadName(filename);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setStatus("success");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : String(error));
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10 space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-teal-300">
            Apple Wallet Pass
          </p>
          <h1 className="text-4xl font-semibold text-white">
            Online Event Pass Builder
          </h1>
          <p className="max-w-2xl text-slate-300">
            Generate a signed Apple Wallet pass for your next online event. Fill in
            the event details, upload optional brand images, and download a
            ready-to-add .pkpass file.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl"
        >
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Branding</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Organization name</span>
                <input
                  value={formState.organizationName}
                  onChange={(event) => updateField("organizationName", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="Your Organization"
                  required
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Event series / program</span>
                <input
                  value={formState.eventSeries}
                  onChange={(event) => updateField("eventSeries", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="Weekly Training Series"
                  required
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Foreground color</span>
                <input
                  value={formState.brandForeground}
                  onChange={(event) => updateField("brandForeground", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="#FFFFFF or rgb(255,255,255)"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Background color</span>
                <input
                  value={formState.brandBackground}
                  onChange={(event) => updateField("brandBackground", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="#202020 or rgb(32,32,32)"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Label color</span>
                <input
                  value={formState.brandLabel}
                  onChange={(event) => updateField("brandLabel", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="#FFFFFF or rgb(255,255,255)"
                />
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Event details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Event title</span>
                <input
                  value={formState.eventTitle}
                  onChange={(event) => updateField("eventTitle", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="Intro to Product Design"
                  required
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Host / presenter</span>
                <input
                  value={formState.hostName}
                  onChange={(event) => updateField("hostName", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="Alex Rivera"
                  required
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Start date & time</span>
                <input
                  type="datetime-local"
                  value={formState.startDateTimeLocal}
                  onChange={(event) => updateField("startDateTimeLocal", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  required
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">End date & time (optional)</span>
                <input
                  type="datetime-local"
                  value={formState.endDateTimeLocal}
                  onChange={(event) => updateField("endDateTimeLocal", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Duration in minutes</span>
                <input
                  type="number"
                  min="1"
                  value={formState.durationMinutes}
                  onChange={(event) => updateField("durationMinutes", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Time zone</span>
                <input
                  value={formState.timezone}
                  onChange={(event) => updateField("timezone", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="America/Los_Angeles"
                  required
                />
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Join link</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Join link label</span>
                <input
                  value={formState.joinLinkLabel}
                  onChange={(event) => updateField("joinLinkLabel", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="Join Live Session"
                  required
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Join link URL</span>
                <input
                  value={formState.joinLinkUrl}
                  onChange={(event) => updateField("joinLinkUrl", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="https://example.com/join"
                  required
                />
              </label>
              <label className="space-y-2 text-sm md:col-span-2">
                <span className="text-slate-300">Fallback text</span>
                <input
                  value={formState.fallbackText}
                  onChange={(event) => updateField("fallbackText", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="Check your email for the link."
                />
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Recipient</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Recipient name</span>
                <input
                  value={formState.recipientName}
                  onChange={(event) => updateField("recipientName", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="Jordan Lee"
                  required
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Recipient email</span>
                <input
                  value={formState.recipientEmail}
                  onChange={(event) => updateField("recipientEmail", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="jordan@example.com"
                  required
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Seat / access tier (optional)</span>
                <input
                  value={formState.seatOrTier}
                  onChange={(event) => updateField("seatOrTier", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="VIP"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Check-in code (optional)</span>
                <input
                  value={formState.checkInCode}
                  onChange={(event) => updateField("checkInCode", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="ABC-123"
                />
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Additional content</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm md:col-span-2">
                <span className="text-slate-300">Agenda (1-2 lines)</span>
                <input
                  value={formState.agenda}
                  onChange={(event) => updateField("agenda", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="Overview, demo, live Q&A"
                />
              </label>
              <label className="space-y-2 text-sm md:col-span-2">
                <span className="text-slate-300">Support text</span>
                <input
                  value={formState.supportText}
                  onChange={(event) => updateField("supportText", event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
                  placeholder="Questions? support@example.com"
                />
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Images (PNG)</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Logo (logo.png)</span>
                <input
                  type="file"
                  accept="image/png"
                  onChange={(event) => handleFile("logoImage", event.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Hero / strip (strip.png)</span>
                <input
                  type="file"
                  accept="image/png"
                  onChange={(event) => handleFile("stripImage", event.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Thumbnail (thumbnail.png)</span>
                <input
                  type="file"
                  accept="image/png"
                  onChange={(event) => handleFile("thumbnailImage", event.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Icon override (icon.png)</span>
                <input
                  type="file"
                  accept="image/png"
                  onChange={(event) => handleFile("iconImage", event.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200"
                />
              </label>
            </div>
          </section>

          {(errors.length > 0 || serverError) && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
              <p className="font-semibold">Please review the following:</p>
              {serverError && <p className="mt-2">{serverError}</p>}
              {errors.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {status === "success" && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <p className="font-semibold">Pass generated successfully.</p>
              {downloadName && <p>Downloaded {downloadName}</p>}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-2xl bg-teal-400 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {status === "loading" ? "Generating pass..." : "Generate .pkpass"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
