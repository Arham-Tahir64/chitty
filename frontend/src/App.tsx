import { useRef, useState } from "react";

const API = "http://localhost:3001";

export default function App() {
  const [username, setUsername] = useState("test");
  const [password, setPassword] = useState("pass123");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [room, setRoom] = useState("general");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  // connect WS
  const connect = () => {
    if (!token) return alert("Login first to get a token");
    const ws = new WebSocket(`ws://localhost:3001?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "join", room }));
    };

    ws.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        setMessages((m) => [...m, msg]);
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
    if (!wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ type: "chat", content: text }));
    setText("");
  };

  const fetchHistory = async () => {
    const res = await fetch(`${API}/rooms/${room}/messages?limit=20`);
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
  };

  const login = async () => {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!data.token) return alert("Login failed");
    localStorage.setItem("token", data.token);
    setToken(data.token);
  };

  const signup = async () => {
    await fetch(`${API}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    alert("Signed up (or username taken). Now click Login.");
  };

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", fontFamily: "Inter, system-ui" }}>
      <h1>Chitty (MVP)</h1>

      <section style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr auto auto" }}>
        <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <input placeholder="room" value={room} onChange={e => setRoom(e.target.value)} />
        <button onClick={signup}>Sign up</button>
        <button onClick={login}>Login</button>
      </section>

      <section style={{ marginTop: 12, display: "flex", gap: 8 }}>
        {!connected ? (
          <button onClick={connect} disabled={!token}>Connect WS</button>
        ) : (
          <button onClick={disconnect}>Disconnect</button>
        )}
        <button onClick={fetchHistory}>Load History</button>
        <span style={{ opacity: 0.7 }}>Status: {connected ? "connected" : "disconnected"}</span>
      </section>

      <section style={{ marginTop: 12 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8, height: 320, overflow: "auto" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ padding: "4px 0" }}>
              {m.type === "chat"
                ? <span><strong>{m.user ?? "?"}</strong> [{m.room}] : {m.content}</span>
                : <em>{JSON.stringify(m)}</em>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            style={{ flex: 1 }}
            placeholder="Type a message"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendChat()}
          />
          <button onClick={sendChat} disabled={!connected || !text.trim()}>Send</button>
        </div>
      </section>
    </div>
  );
}
