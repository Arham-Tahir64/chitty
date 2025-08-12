import type { Room, Member, Message } from '../types';
import './chat.css';

interface ChatAreaProps {
  currentRoom: Room | null;
  messages: Message[];
  text: string;
  connected: boolean;
  setText: (text: string) => void;
  onSendChat: () => void;
  onFetchHistory: () => void;
  members?: Member[];
}

export default function ChatArea({
  currentRoom,
  messages,
  text,
  connected,
  setText,
  onSendChat,
  members = [], // default empty
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

  const formatTime = (ts?: string) => ts
    ? new Date(ts).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
    : '';

  return (
    <div className="chat-shell">
      {/* Left: chat column */}
      <div className="chat-container">
        <div className="chat-header">
          <div>
            <h2 className="chat-title">{currentRoom.name}</h2>
            <span className="chat-code">
              Room {currentRoom.code} • {members.length} online
            </span>
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
                        {formatTime(m.time ?? m.createdAt ?? m.created_at)}
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
              style={{ color: "black" }}
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

      {/* Current Members */}
      <aside className="members-panel">
        <div className="members-header">Members ({members.length})</div>
        <div className="members-list">
          {members.length ? members.map(m => (
            <div key={m.id} className="member-row">
              <div className="avatar">{(m.name ?? m.id).slice(0,1).toUpperCase()}</div>
              <div className="member-meta">
                <div className="member-name">{m.name ?? m.id}</div>
                <div className="member-status">online</div>
              </div>
            </div>
          )) : (
            <div className="members-empty">No one here yet</div>
          )}
        </div>
      </aside>
    </div>
  );
}
