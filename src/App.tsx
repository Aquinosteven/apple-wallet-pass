import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

const passTypes = [
  { value: "generic", label: "generic" },
];

function App() {
  const [passType, setPassType] = useState("generic");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/pass", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ passType }),
      });

      if (!response.ok) {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          setError(data?.message || "Failed to generate pass.");
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
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage(`Downloaded ${filename}`);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setStatus("error");
    }
  };

  return (
    <div className="page">
      <main className="card">
        <header className="header">
          <h1>Apple Wallet Pass — Demo</h1>
          <p>Generate a demo .pkpass and download it locally.</p>
        </header>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Pass type</span>
            <select
              value={passType}
              onChange={(event) => setPassType(event.target.value)}
            >
              {passTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Generating..." : "Generate Pass"}
          </button>
        </form>

        {status === "success" && message && (
          <p className="notice success">{message}</p>
        )}
        {status === "error" && error && (
          <p className="notice error">{error}</p>
        )}

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
