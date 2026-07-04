import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export function DashboardLayout() {
  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1 d-flex flex-column">
        <Navbar />
        <main className="p-4 flex-grow-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
