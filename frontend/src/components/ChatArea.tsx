import type { Room } from '../types';

interface ChatAreaProps {
  currentRoom: Room | null;
  messages: any[];
  text: string;
  connected: boolean;
  setText: (text: string) => void;
  onSendChat: () => void;
  onFetchHistory: () => void;
}

export default function ChatArea({
  currentRoom,
  messages,
  text,
  connected,
  setText,
  onSendChat,
}: ChatAreaProps) {
  if (!currentRoom) {
    return (
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
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        width: "100%",
        height: "100%",
        background: "white",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "20px", borderBottom: "1px solid #ddd", background: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px" }}>{currentRoom.name}</h2>
            <span style={{ fontSize: "14px", color: "#666" }}>Room Code: {currentRoom.code}</span>
          </div>
        </div>
      </div>

      {/* Messages (this is the ONLY scroll area) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "20px",
          background: "white",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", opacity: 0.7, marginTop: 100 }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>No messages yet</div>
            <div style={{ fontSize: 14 }}>Start chatting in {currentRoom.name}!</div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0", marginBottom: 8 }}>
              {m.type === "chat" ? (
                <div>
                  <span style={{ fontWeight: "bold", color: "#007bff" }}>{m.user ?? "?"}</span>
                  <span style={{ margin: "0 8px", color: "#666" }}>•</span>
                  <span style={{ color: "#666", fontSize: 12 }}>{m.room}</span>
                  <div style={{ marginTop: 4, color: "black" }}>{m.content}</div>
                </div>
              ) : (
                <em style={{ color: "#666" }}>{JSON.stringify(m)}</em>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input bar (docked at bottom) */}
      <div
        style={{
          padding: "20px",
          borderTop: "1px solid #ddd",
          background: "white",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <input
            style={{
              flex: 1,
              minWidth: 0,
              padding: "12px",
              borderRadius: 6,
              border: "1px solid #ddd",
              fontSize: 14,
            }}
            placeholder="Type a message..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSendChat()}
            disabled={!connected}
          />
          <button
            onClick={onSendChat}
            disabled={!connected || !text.trim()}
            style={{
              flexShrink: 0,
              padding: "12px 24px",
              borderRadius: 6,
              border: "none",
              background: connected ? "#007bff" : "#ccc",
              color: "white",
              cursor: connected ? "pointer" : "not-allowed",
              fontSize: 14,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}  