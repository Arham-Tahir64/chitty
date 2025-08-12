import type { Room } from '../types';

interface RoomSidebarProps {
  rooms: Room[];
  currentRoom: Room | null;
  newRoomName: string;
  roomCode: string;
  connected: boolean;
  setNewRoomName: (name: string) => void;
  setRoomCode: (code: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onSelectRoom: (room: Room) => void;
  onLogout: () => void;
}

export default function RoomSidebar({
  rooms,
  currentRoom,
  newRoomName,
  roomCode,
  connected,
  setNewRoomName,
  setRoomCode,
  onCreateRoom,
  onJoinRoom,
  onSelectRoom,
  onLogout
}: RoomSidebarProps) {
  return (
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
        color: "black",
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
          onClick={onCreateRoom}
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
          onClick={onJoinRoom}
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
              onClick={() => onSelectRoom(room)}
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

        <button 
          onClick={onLogout}
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
  );
}
