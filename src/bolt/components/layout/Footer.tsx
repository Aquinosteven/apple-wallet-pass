import { Link } from 'react-router-dom';
import ShowfiBrand from '../ShowfiBrand';

const links = [
  { to: '/', label: 'Product' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/wallet-pass-software', label: 'Wallet Pass Software' },
  { to: '/webinar-reminder-software', label: 'Webinar Reminders' },
  { to: '/event-reminder-software', label: 'Event Reminders' },
  { to: '/gohighlevel-appointment-reminders', label: 'GoHighLevel' },
  { to: '/apple-wallet-pass-software', label: 'Apple Wallet' },
  { to: '/google-wallet-pass-software', label: 'Google Wallet' },
  { to: '/login?mode=signin', label: 'Login' },
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <ShowfiBrand
            variant="reverse"
            markClassName="h-7 w-7"
            textClassName="text-sm font-semibold tracking-tight text-gray-900"
            text="ShowFi.io"
          />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            {new Date().getFullYear()} ShowFi.io
          </p>
        </div>
      </div>
    </footer>
  );
}
