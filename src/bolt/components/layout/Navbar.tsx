import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, Menu, X } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isHome = location.pathname === '/';

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled || !isHome
          ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
          : 'bg-white/80 backdrop-blur-sm'
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-gray-900 tracking-tight">
              ShowFi
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {[
              { to: '/', label: 'Home' },
              { to: '/dashboard', label: 'Dashboard' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`
                  px-3.5 py-2 rounded-lg text-sm font-medium transition-colors
                  ${location.pathname === to
                    ? 'text-gblue bg-gblue/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark shadow-sm hover:shadow-md transition-all"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {[
              { to: '/', label: 'Home' },
              { to: '/dashboard', label: 'Dashboard' },
              { to: '/login', label: 'Log in' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`
                  block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${location.pathname === to
                    ? 'text-gblue bg-gblue/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 pb-1">
              <Link
                to="/dashboard"
                className="block w-full text-center px-4 py-2.5 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
