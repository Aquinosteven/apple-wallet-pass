import { FormEvent, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

type WaitlistFormState = {
  name: string;
  email: string;
  company: string;
  useCase: string;
  notes: string;
};

const INITIAL_FORM: WaitlistFormState = {
  name: '',
  email: '',
  company: '',
  useCase: '',
  notes: '',
};

const BENEFITS = [
  'Get first access when onboarding opens back up',
  'Tell us what workflow you need so we can prioritize the right setup',
  'Skip the dead-end checkout path while activations are paused',
];

export default function WaitlistPage() {
  const [form, setForm] = useState<WaitlistFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          source: 'website_waitlist',
          page: '/waitlist',
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Failed to join the waitlist.');
      }

      setForm(INITIAL_FORM);
      setMessage('You are on the list. We will reach out as soon as new onboarding spots open up.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to join the waitlist.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(66,133,244,0.10),_transparent_30%),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] pt-24 pb-14 lg:pt-28 lg:pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-gblue/5 to-transparent" />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full border border-gblue/15 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gblue">
              Waitlist Open
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Checkout is paused.
              <span className="block text-gblue">Join the next onboarding wave.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-gray-600 sm:text-lg">
              We are temporarily routing new interest through a waitlist while we tighten the activation flow.
              Share a few details and we will follow up when new spots open.
            </p>

            <div className="mt-8 space-y-3">
              {BENEFITS.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-ggreen" />
                  <p className="text-sm text-gray-700">{benefit}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
              <Link to="/pricing" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50">
                Review pricing
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="mailto:hello@showfi.io?subject=ShowFi%20waitlist" className="font-medium text-gblue hover:underline">
                Need something sooner? Email hello@showfi.io
              </a>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <h2 className="text-2xl font-semibold text-gray-900">Join the waitlist</h2>
            <p className="mt-2 text-sm text-gray-500">
              We only need a few details so we can follow up with the right onboarding path.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="waitlist-name" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  id="waitlist-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-gblue focus:outline-none focus:ring-2 focus:ring-gblue/20"
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <label htmlFor="waitlist-email" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="waitlist-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-gblue focus:outline-none focus:ring-2 focus:ring-gblue/20"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="waitlist-company" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Company
                </label>
                <input
                  id="waitlist-company"
                  type="text"
                  value={form.company}
                  onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-gblue focus:outline-none focus:ring-2 focus:ring-gblue/20"
                  placeholder="Company or brand"
                />
              </div>

              <div>
                <label htmlFor="waitlist-use-case" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Primary use case
                </label>
                <input
                  id="waitlist-use-case"
                  type="text"
                  value={form.useCase}
                  onChange={(event) => setForm((current) => ({ ...current, useCase: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-gblue focus:outline-none focus:ring-2 focus:ring-gblue/20"
                  placeholder="Booked calls, webinars, live events, challenges..."
                />
              </div>

              <div>
                <label htmlFor="waitlist-notes" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Anything we should know?
                </label>
                <textarea
                  id="waitlist-notes"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-28 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-gblue focus:outline-none focus:ring-2 focus:ring-gblue/20"
                  placeholder="Tell us what you want to launch, your volume, or your timeline."
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gblue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gblue-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Join waitlist
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
