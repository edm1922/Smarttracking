'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPortalRoot() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin-portal/analytics');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
        <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Initializing Admin Dashboard...</p>
      </div>
    </div>
  );
}
