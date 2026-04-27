'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface UnreadCounts {
  [conversationId: string]: number;
}

export function useChatPolling(pollInterval = 8000) {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const res = await api.get('/chat/unread');
      const counts = res.data as UnreadCounts;
      setUnreadCounts(counts);
      
      const total = Object.values(counts).reduce((sum: number, count: any) => sum + (Number(count) || 0), 0);
      setTotalUnread(total);
    } catch (err) {
      console.error('Failed to fetch unread counts', err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCounts();
    
    const interval = setInterval(fetchUnreadCounts, pollInterval);
    
    return () => clearInterval(interval);
  }, [fetchUnreadCounts, pollInterval]);

  return { unreadCounts, totalUnread, refetch: fetchUnreadCounts };
}