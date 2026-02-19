import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../../../../lib/auth';

export default function TopBar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-end gap-3 px-6">
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <LogOut className="w-3.5 h-3.5" />
        Logout
      </button>
      <button
        type="button"
        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
      >
        <User className="w-4 h-4 text-gray-600" />
      </button>
    </header>
  );
}
