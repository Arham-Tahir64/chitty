import { useRef, useState, useEffect, useCallback } from 'react';
import type { Room, Member, Message } from '../types';
import { API_BASE_URL, WS_BASE_URL } from '../config';

const API = API_BASE_URL;

export function useChat(token: string) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingJoinCodeRef = useRef<string | null>(null);

  // Load user's rooms when logged in
  const loadUserRooms = useCallback(async () => {
    try {
      const res = await fetch(`${API}/me/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (error) {
      console.error("Failed to load rooms:", error);
    }
  }, [token]);

  // Refresh members periodically when in a room
  const fetchMembers = useCallback(async () => {
    if (!currentRoom) return;
    try {
      const res = await fetch(`${API}/rooms/${currentRoom.code}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  }, [currentRoom]);

  // Targeted fetches
  const fetchMembersFor = useCallback(async (code: string) => {
    try {
      const res = await fetch(`${API}/rooms/${code}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  }, []);

  // Load user's rooms
  useEffect(() => {
    if (token) {
      loadUserRooms();
    }
  }, [token, loadUserRooms]);

  // Refresh members periodically when in a room
  useEffect(() => {
    if (!currentRoom) return;
    
    const interval = setInterval(() => {
      fetchMembers();
    }, 5000); // Refresh every 5 seconds for snappier presence updates
    
    return () => clearInterval(interval);
  }, [currentRoom, fetchMembers]);

  // Refresh presence when window/tab gains focus or becomes visible
  useEffect(() => {
    const onFocus = () => { fetchMembers(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchMembers(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchMembers]);

  // Create new room
  const createRoom = async (name: string) => {
    try {
      const res = await fetch(`${API}/rooms`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: name || undefined }),
      });
      if (res.ok) {
        const room = await res.json();
        await loadUserRooms();
        // Auto-join the new room
        setCurrentRoom(room);
        if (connected) {
          joinRoom(room.code);
        }
        return room;
      } else {
        throw new Error("Failed to create room");
      }
    } catch (error) {
      console.error("Failed to create room:", error);
      throw error;
    }
  };

  // Join room by code
  const joinRoomByCode = async (code: string) => {
    if (!code.trim()) return;
    
    try {
      const res = await fetch(`${API}/rooms/join`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      
      if (res.ok) {
        await loadUserRooms();
        if (connected) {
          joinRoom(code.trim().toUpperCase());
        }
        return true;
      } else {
        const error = await res.json();
        throw new Error(error.error || "Failed to join room");
      }
    } catch (error) {
      console.error("Failed to join room:", error);
      throw error;
    }
  };

  // Join room in WebSocket
  const ensureConnected = (): Promise<void> => {
    return new Promise((resolve) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === 1) {
        setConnected(true);
        resolve();
        return;
      }
      if (ws && ws.readyState === 0) {
        const handler = () => {
          ws.removeEventListener('open', handler as any);
          setConnected(true);
          resolve();
        };
        ws.addEventListener('open', handler as any);
        return;
      }
      // No socket or closed: create a new connection
      connect().then(resolve);
    });
  };

  const joinRoom = async (code: string) => {
    // Update selected room if we have it in list
    const room = rooms.find(r => r.code === code);
    if (room) {
      setCurrentRoom(room);
    }

    // Ensure socket is connected before sending join
    pendingJoinCodeRef.current = code;
    await ensureConnected();
    const socket = wsRef.current;
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify({ type: "join", code }));
      pendingJoinCodeRef.current = null;
      setMessages([]);
      // Immediately fetch for the intended room to avoid stale state
      await fetchHistoryFor(code);
      await fetchMembersFor(code);
    }
  };

  // Connect WebSocket
  const connect = (): Promise<void> => {
    return new Promise((resolve) => {
      if (!token) { resolve(); return; }
      // Reuse existing socket if connecting/open
      if (wsRef.current) {
        const ws = wsRef.current;
        if (ws.readyState === 1) { setConnected(true); resolve(); return; }
        if (ws.readyState === 0) {
          const handler = () => {
            ws.removeEventListener('open', handler as any);
            setConnected(true);
            resolve();
            const target = pendingJoinCodeRef.current || currentRoom?.code;
            if (target) { ws.send(JSON.stringify({ type: 'join', code: target })); pendingJoinCodeRef.current = null; setMessages([]); }
          };
          ws.addEventListener('open', handler as any);
          return;
        }
      }
      const ws = new WebSocket(`${WS_BASE_URL}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Prefer any queued join otherwise fall back to the current room
        const target = pendingJoinCodeRef.current || currentRoom?.code;
        if (target) {
          ws.send(JSON.stringify({ type: 'join', code: target }));
          pendingJoinCodeRef.current = null;
          setMessages([]);
        }
        resolve();
      };

    ws.onmessage = async (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "joined") {
          // Room joined successfully
          console.log("Joined room:", msg.code);
          await fetchHistoryFor(msg.code);
          await fetchMembersFor(msg.code);
        } else if (msg.type === "error") {
          console.error("WebSocket error:", msg.message || msg.code);
        } else {
          setMessages((m) => [...m, msg]);
          // Refresh members when new messages arrive (new users might have joined)
          if (msg.type === "chat") {
            fetchMembers();
          }
        }
      } catch {
        // ignore
      }
    };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
      };
    });
  };

  const disconnect = () => {
    wsRef.current?.close();
    setConnected(false);
  };

  const sendChat = (content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== 1 || !currentRoom) return;
    wsRef.current.send(JSON.stringify({ type: "chat", content }));
  };

  const fetchHistory = async () => {
    if (!currentRoom) return;
    await fetchHistoryFor(currentRoom.code);
  };

  const fetchHistoryFor = async (code: string) => {
    try {
      const res = await fetch(`${API}/rooms/${code}/messages?limit=20`);
      if (res.ok) {
        const data = await res.json();
        const normalized = data.map((r: { room: string; sender: string; content: string; created_at: string }) => ({
          type: 'chat',
          room: r.room,
          user: r.sender,
          content: r.content,
          time: r.created_at,
        }));
        setMessages(normalized);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const selectRoom = async (room: Room) => {
    setCurrentRoom(room);
    if (!connected) {
      // queue the intended join and connect
      pendingJoinCodeRef.current = room.code;
      await connect();
    } else {
      joinRoom(room.code);
    }
    // History and members will load after we get the 'joined' event
  };

  const clearData = () => {
    setConnected(false);
    setCurrentRoom(null);
    setRooms([]);
    setMessages([]);
    wsRef.current?.close();
  };

  return {
    connected,
    messages,
    rooms,
    currentRoom,
    members,
    connect,
    disconnect,
    sendChat,
    fetchHistory,
    createRoom,
    joinRoomByCode,
    selectRoom,
    loadUserRooms,
    clearData
  };
}
