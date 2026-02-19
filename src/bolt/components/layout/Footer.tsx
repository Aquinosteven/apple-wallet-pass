import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';

const links = [
  { to: '/', label: 'Product' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/login', label: 'Login' },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900 tracking-tight">ShowFi</span>
          </div>

          <div className="flex items-center gap-6">
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
            {new Date().getFullYear()} ShowFi
          </p>
        </div>
      </div>
    </footer>
  );
}
