import { useRef, useState, useEffect } from "react";

const API = "http://localhost:3001";

interface Room {
  id: number;
  code: string;
  name: string;
  created_at: string;
}

export default function App() {
  const [username, setUsername] = useState("test");
  const [password, setPassword] = useState("pass123");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [roomCode, setRoomCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
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
  const createRoom = async () => {
    try {
      const res = await fetch(`${API}/rooms`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newRoomName || undefined }),
      });
      if (res.ok) {
        const room = await res.json();
        setNewRoomName("");
        await loadUserRooms();
        // Auto-join the new room
        setRoomCode(room.code);
        if (connected) {
          joinRoom(room.code);
        }
      } else {
        alert("Failed to create room");
      }
    } catch (error) {
      console.error("Failed to create room:", error);
      alert("Failed to create room");
    }
  };

  // Join room by code
  const joinRoomByCode = async () => {
    if (!roomCode.trim()) return;
    
    try {
      const res = await fetch(`${API}/rooms/join`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: roomCode.trim().toUpperCase() }),
      });
      
      if (res.ok) {
        await loadUserRooms();
        if (connected) {
          joinRoom(roomCode.trim().toUpperCase());
        }
        setRoomCode("");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to join room");
      }
    } catch (error) {
      console.error("Failed to join room:", error);
      alert("Failed to join room");
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

  // connect WS
  const connect = () => {
    if (!token) return alert("Login first to get a token");
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
          alert(`Error: ${msg.message || msg.code}`);
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

  const sendChat = () => {
    if (!wsRef.current || wsRef.current.readyState !== 1 || !currentRoom) return;
    wsRef.current.send(JSON.stringify({ type: "chat", content: text }));
    setText("");
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

  const login = async () => {
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!data.token) return alert("Login failed");
      localStorage.setItem("token", data.token);
      setToken(data.token);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed");
    }
  };

  const signup = async () => {
    try {
      const res = await fetch(`${API}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        alert("Signed up successfully! Now click Login.");
      } else {
        const error = await res.json();
        alert(error.error || "Signup failed");
      }
    } catch (error) {
      console.error("Signup failed:", error);
      alert("Signup failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setConnected(false);
    setCurrentRoom(null);
    setRooms([]);
    setMessages([]);
    wsRef.current?.close();
  };

  return (
    <div style={{ maxWidth: 800, margin: "24px auto", fontFamily: "Inter, system-ui" }}>
      <h1>Chitty (Room Codes MVP)</h1>

      {/* Auth Section */}
      <section style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr auto auto auto" }}>
        <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={signup}>Sign up</button>
        <button onClick={login}>Login</button>
        {token && <button onClick={logout}>Logout</button>}
      </section>

      {token && (
        <>
          {/* Room Management Section */}
          <section style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
            <h3>Room Management</h3>
            
            {/* Create Room */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input 
                placeholder="Room name (optional)" 
                value={newRoomName} 
                onChange={e => setNewRoomName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button onClick={createRoom}>Create Room</button>
            </div>

            {/* Join Room */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input 
                placeholder="Enter room code (e.g., ABC123)" 
                value={roomCode} 
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                style={{ flex: 1 }}
                maxLength={6}
              />
              <button onClick={joinRoomByCode}>Join Room</button>
            </div>

            {/* User's Rooms */}
            <div>
              <h4>Your Rooms:</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {rooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => {
                      setCurrentRoom(room);
                      if (connected) {
                        joinRoom(room.code);
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      border: currentRoom?.id === room.id ? "2px solid #007bff" : "1px solid #ddd",
                      borderRadius: 4,
                      background: currentRoom?.id === room.id ? "#e3f2fd" : "white",
                      cursor: "pointer"
                    }}
                  >
                    <span style={{ color: "black", fontWeight: "bold" }}>{room.code} - {room.name}</span>
                  </button>
                ))}
                {rooms.length === 0 && <span style={{ opacity: 0.7 }}>No rooms yet. Create one or join one!</span>}
              </div>
            </div>
          </section>

          {/* Connection Section */}
          <section style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            {!connected ? (
              <button onClick={connect} disabled={!token}>Connect WS</button>
            ) : (
              <button onClick={disconnect}>Disconnect</button>
            )}
            <button onClick={fetchHistory} disabled={!currentRoom}>Load History</button>
            <span style={{ opacity: 0.7 }}>
              Status: {connected ? "connected" : "disconnected"}
              {currentRoom && ` | Room: ${currentRoom.code} - ${currentRoom.name}`}
            </span>
          </section>

          {/* Chat Section */}
          <section style={{ marginTop: 12 }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8, height: 320, overflow: "auto" }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", opacity: 0.7, marginTop: 100 }}>
                  {currentRoom ? "No messages yet. Start chatting!" : "Select a room to start chatting!"}
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} style={{ padding: "4px 0" }}>
                    {m.type === "chat"
                      ? <span><strong>{m.user ?? "?"}</strong> [{m.room}] : {m.content}</span>
                      : <em>{JSON.stringify(m)}</em>}
                  </div>
                ))
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                style={{ flex: 1 }}
                placeholder={currentRoom ? "Type a message..." : "Select a room first..."}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                disabled={!currentRoom || !connected}
              />
              <button onClick={sendChat} disabled={!connected || !text.trim() || !currentRoom}>Send</button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
