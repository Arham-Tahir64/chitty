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
  const [showAuth, setShowAuth] = useState(!token);
  const wsRef = useRef<WebSocket | null>(null);

  // Load user's rooms when logged in
  useEffect(() => {
    if (token) {
      loadUserRooms();
      setShowAuth(false);
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
        setCurrentRoom(room);
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
    setShowAuth(true);
    wsRef.current?.close();
  };

  // Show auth screen if not logged in
  if (showAuth) {
    return (
      <div style={{ 
        maxWidth: 400, 
        margin: "100px auto", 
        fontFamily: "Inter, system-ui",
        padding: "20px"
      }}>
        <h1 style={{ textAlign: "center", marginBottom: "30px" }}>Chitty</h1>
        
        <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input 
            placeholder="username" 
            value={username} 
            onChange={e => setUsername(e.target.value)}
            style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ddd" }}
          />
          <input 
            placeholder="password" 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ddd" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              onClick={signup}
              style={{ 
                flex: 1, 
                padding: "12px", 
                borderRadius: "6px", 
                border: "none", 
                background: "#f0f0f0",
                color: "black",
                cursor: "pointer"
              }}
            >
              Sign up
            </button>
            <button 
              onClick={login}
              style={{ 
                flex: 1, 
                padding: "12px", 
                borderRadius: "6px", 
                border: "none", 
                background: "#007bff",
                color: "white",
                cursor: "pointer"
              }}
            >
              Login
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      fontFamily: "Inter, system-ui",
      background: "#f5f5f5"
    }}>
      {/* Left Sidebar - Room Management */}
      <div style={{ 
        width: "280px", 
        background: "white", 
        borderRight: "1px solid #ddd",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{ 
          padding: "20px", 
          borderBottom: "1px solid #ddd",
          background: "#f8f9fa"
        }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>Rooms</h2>
        </div>

        {/* Room Creation */}
        <div style={{ padding: "16px", borderBottom: "1px solid #ddd" }}>
          <input 
            placeholder="Room name (optional)" 
            value={newRoomName} 
            onChange={e => setNewRoomName(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "8px", 
              borderRadius: "4px", 
              border: "1px solid #ddd",
              marginBottom: "8px"
            }}
          />
          <button 
            onClick={createRoom}
            style={{ 
              width: "100%", 
              padding: "8px", 
              borderRadius: "4px", 
              border: "none", 
              background: "#28a745",
              color: "white",
              cursor: "pointer"
            }}
          >
            Create Room
          </button>
        </div>

        {/* Join Room */}
        <div style={{ padding: "16px", borderBottom: "1px solid #ddd" }}>
          <input 
            placeholder="Enter room code" 
            value={roomCode} 
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            style={{ 
              width: "100%", 
              padding: "8px", 
              borderRadius: "4px", 
              border: "1px solid #ddd",
              marginBottom: "8px",
              textTransform: "uppercase"
            }}
            maxLength={6}
          />
          <button 
            onClick={joinRoomByCode}
            style={{ 
              width: "100%", 
              padding: "8px", 
              borderRadius: "4px", 
              border: "none", 
              background: "#007bff",
              color: "white",
              cursor: "pointer"
            }}
          >
            Join Room
          </button>
        </div>

        {/* User's Rooms */}
        <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#666" }}>Your Rooms:</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
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
                  borderRadius: "4px",
                  background: currentRoom?.id === room.id ? "#e3f2fd" : "white",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "13px"
                }}
              >
                <div style={{ fontWeight: "bold" }}>{room.code}</div>
                <div style={{ fontSize: "11px", color: "#666" }}>{room.name}</div>
              </button>
            ))}
            {rooms.length === 0 && (
              <span style={{ opacity: 0.7, fontSize: "12px", textAlign: "center" }}>
                No rooms yet. Create one or join one!
              </span>
            )}
          </div>
        </div>

        {/* Connection Status & Logout */}
        <div style={{ 
          padding: "16px", 
          borderTop: "1px solid #ddd",
          background: "#f8f9fa"
        }}>
          <div style={{ marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", color: "#666" }}>
              Status: {connected ? "🟢 connected" : "🔴 disconnected"}
            </span>
          </div>
          
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            {!connected ? (
              <button 
                onClick={connect} 
                disabled={!token}
                style={{ 
                  flex: 1, 
                  padding: "8px", 
                  borderRadius: "4px", 
                  border: "none", 
                  background: "#28a745",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                Connect
              </button>
            ) : (
              <button 
                onClick={disconnect}
                style={{ 
                  flex: 1, 
                  padding: "8px", 
                  borderRadius: "4px", 
                  border: "none", 
                  background: "#dc3545",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                Disconnect
              </button>
            )}
          </div>

          <button 
            onClick={logout}
            style={{ 
              width: "100%", 
              padding: "8px", 
              borderRadius: "4px", 
              border: "none", 
              background: "#6c757d",
              color: "white",
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {currentRoom ? (
          <>
            {/* Chat Header */}
            <div style={{ 
              padding: "20px", 
              borderBottom: "1px solid #ddd",
              background: "white"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "20px" }}>{currentRoom.name}</h2>
                  <span style={{ fontSize: "14px", color: "#666" }}>Room Code: {currentRoom.code}</span>
                </div>
                <button 
                  onClick={fetchHistory}
                  style={{ 
                    padding: "8px 16px", 
                    borderRadius: "4px", 
                    border: "none", 
                    background: "#007bff",
                    color: "white",
                    cursor: "pointer"
                  }}
                >
                  Load History
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{ 
              flex: 1, 
              padding: "20px", 
              overflowY: "auto",
              background: "white"
            }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", opacity: 0.7, marginTop: "100px" }}>
                  <div style={{ fontSize: "18px", marginBottom: "8px" }}>No messages yet</div>
                  <div style={{ fontSize: "14px" }}>Start chatting in {currentRoom.name}!</div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} style={{ 
                    padding: "8px 0", 
                    borderBottom: "1px solid #f0f0f0",
                    marginBottom: "8px"
                  }}>
                    {m.type === "chat" ? (
                      <div>
                        <span style={{ fontWeight: "bold", color: "#007bff" }}>
                          {m.user ?? "?"}
                        </span>
                        <span style={{ margin: "0 8px", color: "#666" }}>•</span>
                        <span style={{ color: "#666", fontSize: "12px" }}>{m.room}</span>
                        <div style={{ marginTop: "4px", color: "black" }}>
                          {m.content}
                        </div>
                      </div>
                    ) : (
                      <em style={{ color: "#666" }}>{JSON.stringify(m)}</em>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <div style={{ 
              padding: "20px", 
              borderTop: "1px solid #ddd",
              background: "white"
            }}>
              <div style={{ display: "flex", gap: "12px" }}>
                <input
                  style={{ 
                    flex: 1, 
                    padding: "12px", 
                    borderRadius: "6px", 
                    border: "1px solid #ddd",
                    fontSize: "14px"
                  }}
                  placeholder="Type a message..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                  disabled={!connected}
                />
                <button 
                  onClick={sendChat} 
                  disabled={!connected || !text.trim()}
                  style={{ 
                    padding: "12px 24px", 
                    borderRadius: "6px", 
                    border: "none", 
                    background: connected ? "#007bff" : "#ccc",
                    color: "white",
                    cursor: connected ? "pointer" : "not-allowed",
                    fontSize: "14px"
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No Room Selected */
          <div style={{ 
            flex: 1, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            background: "white"
          }}>
            <div style={{ textAlign: "center", opacity: 0.7 }}>
              <div style={{ fontSize: "24px", marginBottom: "12px" }}>👋</div>
              <div style={{ fontSize: "18px", marginBottom: "8px" }}>Welcome to Chitty!</div>
              <div style={{ fontSize: "14px" }}>Select a room from the sidebar to start chatting</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
