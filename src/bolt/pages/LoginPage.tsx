import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Wallet } from 'lucide-react';
import { signIn, signUp } from '../../lib/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<'signin' | 'signup' | null>(null);

  const submitAuth = async (mode: 'signin' | 'signup') => {
    setSubmitting(mode);
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Email and password are required.');
      setSubmitting(null);
      return;
    }

    try {
      if (mode === 'signin') {
        const { error: signInError } = await signIn(cleanEmail, password);
        if (signInError) {
          setError(signInError.message);
          return;
        }
        navigate('/dashboard', { replace: true });
        return;
      }

      const { data, error: signUpError } = await signUp(cleanEmail, password);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        navigate('/dashboard', { replace: true });
      } else {
        setMessage('Account created. Confirm your email if required, then sign in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleSignInSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitAuth('signin');
  };

  const handleSignUpClick = () => {
    void submitAuth('signup');
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
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-gray-900">Welcome back</h1>
            <p className="mt-1.5 text-sm text-gray-500">Sign in or create an account to manage your events.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSignInSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gblue focus:outline-none focus:ring-2 focus:ring-gblue/20"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gblue focus:outline-none focus:ring-2 focus:ring-gblue/20"
                placeholder="••••••••"
                required
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={submitting !== null}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting === 'signin' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Sign In
              </button>
              <button
                type="button"
                onClick={handleSignUpClick}
                disabled={submitting !== null}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting === 'signup' ? 'Creating account...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
