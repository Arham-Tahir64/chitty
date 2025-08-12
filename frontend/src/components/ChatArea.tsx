import type { Room } from '../types';
import './chat.css';

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
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h2 className="chat-title">{currentRoom.name}</h2>
          <span className="chat-code">Room {currentRoom.code}</span>
        </div>
      </div>

      <div className="message-list">
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", opacity: 0.7, marginTop: 100 }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>No messages yet</div>
            <div style={{ fontSize: 14 }}>Start chatting in {currentRoom.name}!</div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="message">
              {m.type === "chat" ? (
                <div>
                  <div className="message-header">
                    <span className="message-user">{m.user ?? "?"}</span>
                    <span className="message-dot">•</span>
                    <span className="message-time">
                    {(m.time || m.createdAt || m.created_at)
                      ? new Date(m.time || m.createdAt || m.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                      : ''}
                    </span>
                  </div>
                  <div className="message-content">{m.content}</div>
                </div>
              ) : (
                <em style={{ color: "#666" }}>{JSON.stringify(m)}</em>
              )}
            </div>
          ))
        )}
      </div>

      <div className="chat-input-bar">
        <div className="chat-input-row">
          <input
            className="chat-input"
            placeholder="Type a message..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSendChat()}
            disabled={!connected}
          />
          <button
            className="send-btn"
            onClick={onSendChat}
            disabled={!connected || !text.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}  