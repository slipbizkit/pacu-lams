import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { SidebarProvider } from '../context/SidebarContext';

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="d-flex">
        <Sidebar />
        <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
          <Navbar />
          <main className="p-4 flex-grow-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
