import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { LobbyData } from '@/lib/api';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface UseSocketOptions {
  lobbyId: string;
  userId: string;
  onLobbyUpdate?: (lobby: LobbyData) => void;
  onError?: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useSocket({
  lobbyId,
  userId,
  onLobbyUpdate,
  onError,
  onConnect,
  onDisconnect,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(() => {
    if (socketRef.current?.connected || !lobbyId) return;

    setIsConnecting(true);

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      setIsConnecting(false);
      onConnect?.();

      // Join the lobby room
      socket.emit('lobby:join', { lobbyId, userId });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      onDisconnect?.();
    });

    // Listen for lobby state updates
    socket.on('lobby:state', (data: { lobby: LobbyData }) => {
      console.log('Lobby state update:', data);
      onLobbyUpdate?.(data.lobby);
    });

    // Listen for errors
    socket.on('error', (data: { error: string }) => {
      console.error('Socket error:', data.error);
      onError?.(data.error);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnecting(false);
      onError?.('Connection failed. Retrying...');
    });

    socketRef.current = socket;
  }, [lobbyId, userId, onLobbyUpdate, onError, onConnect, onDisconnect]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('lobby:leave', { lobbyId });
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, [lobbyId]);

  const leaveLobby = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('lobby:leave', { lobbyId });
    }
  }, [lobbyId]);

  useEffect(() => {
    if (lobbyId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [lobbyId, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    disconnect,
    leaveLobby,
    socket: socketRef.current,
  };
}
