'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TransmittalPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard/transmittal/product');
  }, [router]);

  return null;
}
