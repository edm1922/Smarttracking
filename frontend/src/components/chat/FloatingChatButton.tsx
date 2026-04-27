'use client';

import { X, MessageCircle } from 'lucide-react';

interface FloatingChatButtonProps {
  onClick: () => void;
  unreadCount: number;
}

export default function FloatingChatButton({ onClick, unreadCount }: FloatingChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-110"
      style={{ backgroundColor: '#0d9488' }}
    >
      {unreadCount > 0 ? (
        <div className="relative">
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </div>
      ) : (
        <MessageCircle className="w-6 h-6" />
      )}
    </button>
  );
}