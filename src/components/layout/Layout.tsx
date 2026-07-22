import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ToastContainer from '../ui/Toast';

export default function Layout() {
  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <Sidebar />
      <main className="ml-[220px] min-h-screen px-8 py-8">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
