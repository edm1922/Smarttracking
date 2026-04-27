'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, ArrowLeft, Loader2, User, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';

interface UserInfo {
  id: string;
  username: string;
  role: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  participant1: string;
  participant2: string;
  lastMessage: string | null;
  updatedAt: string;
  messages: Message[];
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUsername: string;
  currentUserRole: string;
}

export default function ChatDrawer({ isOpen, onClose, currentUserId, currentUsername, currentUserRole }: ChatDrawerProps) {
  const [view, setView] = useState<'list' | 'chat' | 'new'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (view === 'chat' && activeConversation) {
      fetchMessages(activeConversation.id);
    }
  }, [view, activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/chat-partners');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await api.get(`/chat/messages/${conversationId}`);
      setMessages(res.data);
      await api.patch(`/chat/messages/${conversationId}/read`);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const startNewChat = async (userId: string) => {
    try {
      const res = await api.get(`/chat/conversation/${userId}`);
      const conversation = res.data;
      setActiveConversation(conversation);
      setView('chat');
    } catch (err) {
      console.error('Failed to start chat', err);
    }
  };

  const selectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    setView('chat');
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    const otherUserId = activeConversation.participant1 === currentUserId
      ? activeConversation.participant2
      : activeConversation.participant1;

    setSending(true);
    try {
      await api.post('/chat/messages', {
        receiverId: otherUserId,
        content: newMessage,
      });
      setNewMessage('');
      fetchMessages(activeConversation.id);
      fetchConversations();
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!activeConversation) return;
    setDeletingId(messageId);
    try {
      await api.delete(`/chat/messages/${messageId}`);
      fetchMessages(activeConversation.id);
      fetchConversations();
    } catch (err) {
      console.error('Failed to delete message', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getOtherParticipant = (conv: Conversation) => {
    const otherId = conv.participant1 === currentUserId ? conv.participant2 : conv.participant1;
    return otherId.slice(0, 8);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-6 w-80 h-[500px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-100">
      <div className="bg-primary text-white p-4 flex items-center justify-between" style={{ backgroundColor: '#0d9488' }}>
        {view === 'chat' ? (
          <button onClick={() => setView('list')} className="flex items-center gap-2 hover:text-white/80">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        ) : view === 'new' ? (
          <button onClick={() => setView('list')} className="flex items-center gap-2 hover:text-white/80">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        ) : (
          <h3 className="font-bold">Messages</h3>
        )}
        <button onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {view === 'list' ? (
        <div className="flex-1 overflow-y-auto">
          <button
            onClick={() => setView('new')}
            className="w-full p-3 flex items-center justify-center gap-2 border-b bg-primary text-white hover:bg-primary-dark"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New Conversation</span>
          </button>
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No conversations yet</p>
              <p className="text-xs mt-2">Start a new chat above</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className="w-full p-4 text-left border-b hover:bg-gray-50"
              >
                <div className="font-medium">{getOtherParticipant(conv)}</div>
                <div className="text-sm text-gray-500 truncate">{conv.lastMessage || 'No messages'}</div>
              </button>
            ))
          )}
        </div>
      ) : view === 'new' ? (
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs text-gray-500 mb-3">Select a user to start conversation</p>
          <div className="space-y-2">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => startNewChat(user.id)}
                className="w-full p-3 flex items-center gap-3 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <User className="w-5 h-5 text-gray-500" />
                <div className="text-left">
                  <div className="font-medium text-sm">{user.username}</div>
                  <div className="text-xs text-gray-400 capitalize">{user.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col group relative ${msg.senderId === currentUserId ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-gray-500 mb-1 px-1">
                  {msg.senderId === currentUserId ? 'You' : msg.senderId.slice(0, 8)}
                </span>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm relative ${
                    msg.senderId === currentUserId
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                  style={msg.senderId === currentUserId ? { backgroundColor: '#0d9488' } : {}}
                >
                  {msg.content}
                  {msg.senderId === currentUserId && (
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      disabled={deletingId === msg.id}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {deletingId === msg.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-3 border-t flex flex-col gap-2">
            {sending && (
              <p className="text-[10px] text-gray-500 px-1">Note: Messages may take 5-10 seconds to deliver</p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border rounded-full text-sm outline-none focus:border-primary"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="p-2 bg-primary text-white rounded-full disabled:opacity-50"
                style={{ backgroundColor: '#0d9488' }}
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}