import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function isTerminalTokenValid(): boolean {
  const token = localStorage.getItem('terminal_token');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default function KioskRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [valid, setValid] = useState(isTerminalTokenValid);
  const checkedRef = useRef(true);

  useEffect(() => {
    function handleExpired() {
      setValid(false);
    }
    window.addEventListener('terminal:session-expired', handleExpired);
    return () => window.removeEventListener('terminal:session-expired', handleExpired);
  }, []);

  if (!valid && checkedRef.current) {
    return <Navigate to={`/terminal-login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}
