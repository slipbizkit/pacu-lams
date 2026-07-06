import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { SidebarProvider } from '../context/SidebarContext';

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0, overflow: 'hidden' }}>
          <Navbar />
          <main className="p-4" style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
