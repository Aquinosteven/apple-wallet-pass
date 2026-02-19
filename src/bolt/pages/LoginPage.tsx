import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/80 px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-navy flex items-center justify-center mx-auto shadow-lg shadow-navy/15">
            <Wallet className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {sent ? (
            <div className="text-center py-4 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Check your inbox</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                We sent a magic link to <span className="font-medium text-gray-700">{email}</span>. Redirecting you now...
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl font-semibold text-gray-900">Welcome back</h1>
                <p className="mt-1.5 text-sm text-gray-500">Sign in to your PassKit account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoFocus
                    className="input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Send Magic Link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-gray-400">
                No password required. We'll email you a secure link.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
