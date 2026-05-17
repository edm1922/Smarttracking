'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnalyticsSkeleton } from '@/components/ui/LoadingSkeletons';

export default function AdminPortalRoot() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin-portal/analytics');
  }, [router]);

  return (
    <div className="w-full">
      <AnalyticsSkeleton />
    </div>
  );
}
