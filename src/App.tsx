import { useEffect, useMemo, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

const presets = [
  { value: "webinar", label: "Webinar" },
  { value: "challenge", label: "Challenge" },
  { value: "booked_call", label: "Booked Call" },
];

function toIsoWithOffset(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const tz = -date.getTimezoneOffset();
  const sign = tz >= 0 ? "+" : "-";
  const abs = Math.abs(tz);
  const tzHours = pad(Math.floor(abs / 60));
  const tzMinutes = pad(abs % 60);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}${sign}${tzHours}:${tzMinutes}`;
}

function App() {
  const [preset, setPreset] = useState("webinar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [startsAtInput, setStartsAtInput] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [logoName, setLogoName] = useState<string>("");
  const [themeMode, setThemeMode] = useState<"color" | "image">("color");
  const [themeColor, setThemeColor] = useState<string>("#202020");
  const [stripImageBase64, setStripImageBase64] = useState<string>("");
  const [stripImageName, setStripImageName] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>("personalized.pkpass");

  useEffect(() => {
    return () => {
      if (downloadUrl) window.URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const canSubmit = useMemo(() => {
    return (
      name.trim() &&
      email.trim() &&
      eventTitle.trim() &&
      startsAtInput.trim() &&
      joinUrl.trim() &&
      logoBase64 &&
      (themeMode === "image" ? stripImageBase64 : true)
    );
  }, [
    name,
    email,
    eventTitle,
    startsAtInput,
    joinUrl,
    logoBase64,
    themeMode,
    stripImageBase64,
  ]);

  const handleLogoChange = (file: File | null) => {
    if (!file) {
      setLogoBase64("");
      setLogoName("");
      return;
    }
    setLogoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoBase64(String(reader.result || ""));
    };
    reader.onerror = () => {
      setLogoBase64("");
      setLogoName("");
      setError("Failed to read logo file.");
    };
    reader.readAsDataURL(file);
  };

  const handleStripImageChange = (file: File | null) => {
    if (!file) {
      setStripImageBase64("");
      setStripImageName("");
      return;
    }
    setStripImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setStripImageBase64(String(reader.result || ""));
    };
    reader.onerror = () => {
      setStripImageBase64("");
      setStripImageName("");
      setError("Failed to read strip image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setDownloadUrl(null);

    const errors: string[] = [];
    if (!name.trim()) errors.push("Name is required.");
    if (!email.trim()) errors.push("Email is required.");
    if (!eventTitle.trim()) errors.push("Event title is required.");
    if (!startsAtInput.trim()) errors.push("Date/time is required.");
    if (!joinUrl.trim()) errors.push("Join URL is required.");
    if (!logoBase64) errors.push("Logo is required.");
    if (themeMode === "image" && !stripImageBase64) {
      errors.push("Strip image is required for image theme.");
    }
    if (joinUrl && !/^https?:\/\//i.test(joinUrl.trim())) {
      errors.push("Join URL must start with http:// or https://");
    }
    if (errors.length) {
      setError(errors.join(" "));
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      const startsAt = toIsoWithOffset(startsAtInput);
      if (!startsAt) {
        setError("Please provide a valid date/time.");
        setStatus("error");
        return;
      }

      const themePayload: {
        mode: "color" | "image";
        backgroundColor: string;
        stripImageBase64?: string;
      } = {
        mode: themeMode,
        backgroundColor: themeColor,
      };
      if (themeMode === "image" && stripImageBase64) {
        themePayload.stripImageBase64 = stripImageBase64;
      }

      const response = await fetch("/api/pass", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          preset,
          attendee: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
          },
          event: {
            title: eventTitle.trim(),
            startsAt,
            joinUrl: joinUrl.trim(),
          },
          branding: {
            logoBase64,
          },
          theme: themePayload,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          const fieldErrors = Array.isArray(data?.fields)
            ? data.fields
            : Array.isArray(data?.errors)
            ? data.errors
            : null;
          if (fieldErrors && fieldErrors.length) {
            setError(fieldErrors.join(" "));
          } else {
            setError(data?.message || text || "Failed to generate pass.");
          }
        } catch {
          setError(text || "Failed to generate pass.");
        }
        setStatus("error");
        return;
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
      const filename = filenameMatch?.[1] || "demo.pkpass";

      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(filename);
      setMessage(`Pass ready: ${filename}`);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setStatus("error");
    } finally {
      setStatus((current) => (current === "loading" ? "idle" : current));
    }
  };

  return (
    <div className="page">
      <main className="card">
        <header className="header">
          <h1>Apple Wallet Pass — Personalization</h1>
          <p>Generate a personalized .pkpass with attendee + event details.</p>
        </header>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Preset</span>
            <select
              value={preset}
              onChange={(event) => setPreset(event.target.value)}
            >
              {presets.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Jane Doe"
              required
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="jane@email.com"
              required
            />
          </label>

          <label className="field">
            <span>Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+1 512-555-1212"
            />
          </label>

          <label className="field">
            <span>Event title</span>
            <input
              type="text"
              value={eventTitle}
              onChange={(event) => setEventTitle(event.target.value)}
              placeholder="Mo Challenge Kickoff"
              required
            />
          </label>

          <label className="field">
            <span>Date &amp; time</span>
            <input
              type="datetime-local"
              value={startsAtInput}
              onChange={(event) => setStartsAtInput(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Join URL</span>
            <input
              type="url"
              value={joinUrl}
              onChange={(event) => setJoinUrl(event.target.value)}
              placeholder="https://zoom.us/j/123"
              required
            />
          </label>

          <label className="field">
            <span>Logo (PNG)</span>
            <input
              type="file"
              accept="image/png"
              onChange={(event) => handleLogoChange(event.target.files?.[0] || null)}
              required
            />
            {logoName ? <em>Selected: {logoName}</em> : null}
          </label>

          <label className="field">
            <span>Theme mode</span>
            <select
              value={themeMode}
              onChange={(event) =>
                setThemeMode(event.target.value === "image" ? "image" : "color")
              }
            >
              <option value="color">Color</option>
              <option value="image">Image</option>
            </select>
          </label>

          <label className="field">
            <span>Background color</span>
            <input
              type="color"
              value={themeColor}
              onChange={(event) => setThemeColor(event.target.value)}
            />
          </label>

          {themeMode === "image" ? (
            <label className="field">
              <span>Strip image (PNG)</span>
              <input
                type="file"
                accept="image/png"
                onChange={(event) =>
                  handleStripImageChange(event.target.files?.[0] || null)
                }
                required
              />
              {stripImageName ? <em>Selected: {stripImageName}</em> : null}
            </label>
          ) : null}

          {status === "error" && error && (
            <p className="notice error">{error}</p>
          )}

          <button type="submit" disabled={status === "loading" || !canSubmit}>
            {status === "loading" ? "Generating..." : "Generate Pass"}
          </button>
        </form>

        {status === "success" && message && (
          <p className="notice success">{message}</p>
        )}
        

        {status === "success" && downloadUrl ? (
          <div className="actions">
            <a href={downloadUrl} download={downloadName}>
              Download .pkpass
            </a>
          </div>
        ) : null}

        <div className="actions">
          <a href="/api/health-pass" target="_blank" rel="noreferrer">
            Open API health
          </a>
        </div>
      </main>
    </div>
  );
}

export default App;
