import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ToastContainer from '../ui/Toast';
import { useSettings } from '../../hooks/useSettings';

export default function Layout() {
  const { settings } = useSettings();

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

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
