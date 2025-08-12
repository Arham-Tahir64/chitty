import { useRef, useState, useEffect } from 'react';
import type { Room } from '../types';

const API = "http://localhost:3001";

export function useChat(token: string) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load user's rooms when logged in
  useEffect(() => {
    if (token) {
      loadUserRooms();
    }
  }, [token]);

  // Load user's rooms
  const loadUserRooms = async () => {
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
  };

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
  const joinRoom = (code: string) => {
    if (!wsRef.current || wsRef.current.readyState !== 1) return;
    
    // Find room info
    const room = rooms.find(r => r.code === code);
    if (room) {
      setCurrentRoom(room);
    }
    
    wsRef.current.send(JSON.stringify({ type: "join", code }));
    setMessages([]); // Clear messages when joining new room
  };

  // Connect WebSocket
  const connect = () => {
    if (!token) return;
    const ws = new WebSocket(`ws://localhost:3001?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Join the current room if we have one
      if (currentRoom) {
        joinRoom(currentRoom.code);
      }
    };

    ws.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "joined") {
          // Room joined successfully
          console.log("Joined room:", msg.code);
        } else if (msg.type === "error") {
          console.error("WebSocket error:", msg.message || msg.code);
        } else {
          setMessages((m) => [...m, msg]);
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => setConnected(false);
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
    
    try {
      const res = await fetch(`${API}/rooms/${currentRoom.code}/messages?limit=20`);
      if (res.ok) {
        const data = await res.json();
        // normalize to same format we append in onmessage
        const normalized = data.map((r: any) => ({
          type: "chat",
          room: r.room,
          user: r.sender,
          content: r.content,
          time: r.created_at,
        }));
        setMessages(normalized);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const selectRoom = async (room: Room) => {
    setCurrentRoom(room);
    
    // Auto-connect if not connected
    if (!connected) {
      await connect();
    }
    
    // Join the room and load history
    joinRoom(room.code);
    await fetchHistory();
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
