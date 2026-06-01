import { useState, useEffect, useRef } from 'react';

export type Log = {
  id: string;
  action: string;
  user: string;
  role: string;
  ip: string;
  time: string;
  status: 'success' | 'warning' | 'error' | string;
};

// Cache IP để không fetch lại mỗi lần ghi log
let cachedIP: string | null = null;

async function getClientIP(): Promise<string> {
  if (cachedIP) return cachedIP;
  try {
    const res = await fetch('/api/ip');
    const data = await res.json();
    cachedIP = data.ip || '127.0.0.1';
    return cachedIP!;
  } catch {
    return '127.0.0.1';
  }
}

export function useLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const isMounted = useRef(true);

  const loadLogs = async () => {
    const role = typeof window !== 'undefined' ? (localStorage.getItem('userRole') || '') : '';
    try {
      const res = await fetch(`/api/logs?role=${role}`);
      const data = await res.json();
      if (isMounted.current) setLogs(data.logs || []);
    } catch {
      if (isMounted.current) setLogs([]);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadLogs();
    const handler = () => loadLogs();
    window.addEventListener('vntrust_log_update', handler);
    return () => {
      isMounted.current = false;
      window.removeEventListener('vntrust_log_update', handler);
    };
  }, []);

  const addLog = async (log: { action: string; user: string; ip?: string; status?: string }) => {
    const role = typeof window !== 'undefined' ? (localStorage.getItem('userRole') || 'user') : 'user';
    // Tự động lấy IP thật nếu không truyền vào
    const ip = log.ip || await getClientIP();
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: log.action,
          user: log.user,
          role,
          ip,
          status: log.status || 'success',
        }),
      });
      window.dispatchEvent(new Event('vntrust_log_update'));
      await loadLogs();
    } catch {
      // silently fail
    }
  };

  return { logs, addLog };
}
