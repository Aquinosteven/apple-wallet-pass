import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar />
      <div className="pl-56">
        <TopBar />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
