import { useState } from 'react';
import { Shield, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../../../lib/auth';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error.message || 'Failed to sign in.');
      return;
    }

    navigate('/admin', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#09111f] px-4 py-10 text-slate-100 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[28px] border border-slate-800 bg-[#07101d] p-8 shadow-2xl shadow-slate-950/30">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-300">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="mt-8 max-w-md text-4xl font-semibold tracking-tight text-white">Internal backoffice for accounts, billing, support, and recovery.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-400">
            This admin portal is separate from the customer dashboard and only for internal operators. Customer billing state does not gate admin access here.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">Account search, service controls, and usage visibility</div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">Manual billing overrides, support ticket routing, and audit review</div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">Password recovery and impersonation actions with required reasons</div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-800 bg-white p-8 text-slate-900 shadow-2xl shadow-slate-950/30">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">ShowFi admin</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to the admin center</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Use an internal support account. If the signed-in account lacks internal roles, the admin route will stay blocked.</p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-emerald-500"
                placeholder="hello@showfi.io"
                autoComplete="email"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-emerald-500"
                placeholder="Your admin password"
                autoComplete="current-password"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Enter admin center
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
