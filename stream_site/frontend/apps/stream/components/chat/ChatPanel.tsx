'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ReconnectingWS } from '@/lib/ws';
import { useTranslations } from 'next-intl';

interface ChatMessage {
  type: 'chat' | 'score_update' | 'status_update';
  username?: string;
  text?: string;
  sent_at?: string;
  home_score?: number;
  away_score?: number;
  minute?: number;
}

interface Props {
  matchId: number;
  onScoreUpdate?: (home: number, away: number, minute: number) => void;
}

const MAX_CHAT_MESSAGES = 120;

export default function ChatPanel({ matchId, onScoreUpdate }: Props) {
  const tChat = useTranslations('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [usernameSet, setUsernameSet] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const wsRef = useRef<ReconnectingWS | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('wc26_username');
    if (stored) { setUsername(stored); setUsernameSet(true); }
  }, []);

  const connect = useCallback(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/api/ws/chat/${matchId}?username=${encodeURIComponent(username || tChat('anonymous'))}`;
    wsRef.current?.close();
    wsRef.current = new ReconnectingWS(
      url,
      (data) => {
        const msg = data as ChatMessage;
        if (msg.type === 'score_update' && onScoreUpdate) {
          onScoreUpdate(msg.home_score ?? 0, msg.away_score ?? 0, msg.minute ?? 0);
        }
        if (msg.type === 'chat') {
          setMessages((prev) => [...prev, msg].slice(-MAX_CHAT_MESSAGES));
        }
      },
      setStatus
    );
  }, [matchId, onScoreUpdate, tChat, username]);

  useEffect(() => {
    if (usernameSet) connect();
    return () => wsRef.current?.close();
  }, [usernameSet, connect]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const send = () => {
    if (!input.trim() || !usernameSet) return;
    wsRef.current?.send({ text: input.trim() });
    setInput('');
  };

  const saveUsername = () => {
    if (!username.trim()) return;
    localStorage.setItem('wc26_username', username.trim());
    setUsernameSet(true);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <span className="text-white font-semibold text-sm">{tChat('title')}</span>
        <span className={`text-xs flex items-center gap-1 ${
          status === 'connected' ? 'text-green-400' :
          status === 'disconnected' ? 'text-red-400' : 'text-yellow-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            status === 'connected' ? 'bg-green-400 animate-pulse' :
            status === 'disconnected' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
          }`} />
          {status === 'connecting' ? tChat('connecting') : status === 'connected' ? tChat('connected') : tChat('disconnected')}
        </span>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className="text-sm">
            <span className="text-yellow-400 font-medium">{msg.username}: </span>
            <span className="text-gray-300">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Username setup or input */}
      {!usernameSet ? (
        <div className="p-3 border-t border-gray-800 flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveUsername()}
            placeholder={tChat('joinAs')}
            maxLength={30}
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-yellow-400"
          />
          <button
            onClick={saveUsername}
            className="bg-yellow-400 text-gray-950 font-bold text-sm px-4 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            {tChat('join')}
          </button>
        </div>
      ) : (
        <div className="p-3 border-t border-gray-800 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={tChat('placeholder')}
            maxLength={500}
            disabled={status !== 'connected'}
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-yellow-400 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || status !== 'connected'}
            className="bg-yellow-400 text-gray-950 font-bold text-sm px-4 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
