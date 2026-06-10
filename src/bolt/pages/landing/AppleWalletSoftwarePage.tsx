import { ArrowRight, CheckCircle2, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';

const benefits = [
  'Apple Wallet passes for events, webinars, booked calls, and challenge funnels',
  'Post-opt-in delivery flows that reinforce attendance automatically',
  'GoHighLevel integration, reminders, claim flows, and operational tracking',
];

const useCases = [
  'Booked sales calls that need higher show rate',
  'Webinars that depend on day-of attendance',
  'Live events and ticketed experiences that need reliable wallet delivery',
];

const whenToUse = [
  'Your audience is mobile-first and needs the event details close to the start time.',
  'The confirmation email gets buried before webinars, booked calls, or event check-in.',
  'You want Apple Wallet to support the same attendance workflow as SMS, email, and calendar.',
  'You need a visible reminder layer without asking the registrant to install a new app.',
];

const retrievalComparison = [
  'Email is best for longer confirmation details and pre-event context.',
  'SMS is best for short final reminders when consent is already clear.',
  'Calendar is best for blocking the time.',
  'Apple Wallet is best for making the pass or join path easy to recover from an iPhone.',
];

const faqs = [
  {
    question: 'What is Apple Wallet pass software used for?',
    answer:
      'It is used to create and deliver Apple Wallet passes for timed moments like webinars, booked calls, workshops, live events, and ticketed experiences.',
  },
  {
    question: 'Can Apple Wallet passes reduce webinar or call no-shows?',
    answer:
      'They can help by making the event easier to find on mobile, especially when paired with email, SMS, and calendar reminders.',
  },
  {
    question: 'Do teams still need Google Wallet support?',
    answer:
      'Yes. Apple Wallet covers iPhone users, but mixed audiences usually need Google Wallet too so Android attendees are not pushed into a weaker fallback path.',
  },
  {
    question: 'When should the Apple Wallet pass be offered?',
    answer:
      'Offer it immediately after registration or booking, while intent is high and before the reminder sequence starts.',
  },
];

const relatedLinks = [
  { to: '/wallet-pass-software', label: 'Wallet pass software' },
  { to: '/google-wallet-pass-software', label: 'Google Wallet pass software' },
  { to: '/webinar-reminder-software', label: 'Webinar reminder software' },
  { to: '/zoom-webinar-reminders', label: 'Zoom webinar reminders' },
  { to: '/reduce-webinar-no-shows', label: 'Reduce webinar no-shows' },
  { to: '/booked-call-reminders', label: 'Booked call reminders' },
];

export default function AppleWalletSoftwarePage() {
  return (
    <div className="bg-white">
      <section className="pt-24 pb-12 lg:pt-28 lg:pb-16 bg-gradient-to-b from-gblue/[0.06] via-white to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gblue/15 bg-white px-3 py-1 text-xs font-semibold text-gblue">
              <WalletCards className="w-4 h-4" />
              Apple Wallet software
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
              Apple Wallet pass software for teams that need people to show up
            </h1>
            <p className="mt-5 max-w-2xl text-base sm:text-lg text-gray-600 leading-relaxed">
              ShowFi.io helps marketers, agencies, and event operators deliver Apple Wallet passes that keep booked calls,
              webinars, and live events visible when timing matters most.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-gblue px-5 py-3 text-sm font-semibold text-white hover:bg-gblue-dark transition-colors"
              >
                See pricing
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/waitlist"
                className="inline-flex items-center rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Join waitlist
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-ggreen" />
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-gray-50/70 p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Why teams choose Apple Wallet passes</h2>
            <p className="mt-3 max-w-3xl text-sm sm:text-base text-gray-600 leading-relaxed">
              Apple Wallet lives on the device, surfaces by time, and gives your reminder a stronger presence than email
              alone. That makes it especially useful for attendance-driven funnels.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {useCases.map((item) => (
                <li key={item} className="rounded-xl border border-white bg-white p-4 text-sm text-gray-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">When to use Apple Wallet passes</h2>
              <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
                Apple Wallet is strongest when the user already committed and the job is helping them recover the next step
                on an iPhone.
              </p>
              <ul className="mt-5 grid gap-3">
                {whenToUse.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-gray-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-gblue" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Apple Wallet vs email, SMS, and calendar</h2>
              <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
                The point is not to replace every reminder channel. It is to give each channel a clear attendance job.
              </p>
              <ul className="mt-5 grid gap-3">
                {retrievalComparison.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-gray-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-ggreen" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Frequently asked questions</h2>
            <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
              Practical answers for teams comparing Apple Wallet passes to the rest of their reminder stack.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Related ShowFi.io pages</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {relatedLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="inline-flex items-center rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
