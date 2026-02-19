import { User } from 'lucide-react';

export default function TopBar() {
  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-end px-6">
      <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
        <User className="w-4 h-4 text-gray-600" />
      </button>
    </header>
  );
}
