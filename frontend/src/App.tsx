import { Outlet } from 'react-router-dom';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Outlet />
    </div>
  );
}
