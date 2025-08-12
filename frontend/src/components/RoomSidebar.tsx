import type { Room } from '../types';
import './rooms.css';

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
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Rooms</h2>
      </div>

      <div className="sidebar-section">
        <input
          className="text-input"
          placeholder="Room name (optional)"
          value={newRoomName}
          onChange={e => setNewRoomName(e.target.value)}
        />
        <button className="btn-primary" onClick={onCreateRoom}>Create Room</button>
      </div>

      <div className="sidebar-section">
        <input
          className="text-input"
          placeholder="Enter room code"
          value={roomCode}
          onChange={e => setRoomCode(e.target.value.toUpperCase())}
          maxLength={6}
          style={{ textTransform: 'uppercase' }}
        />
        <button className="btn-secondary" onClick={onJoinRoom}>Join Room</button>
      </div>

      <div className="sidebar-section" style={{ flex: 1, overflow: 'hidden' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#64748b' }}>Your Rooms</h4>
        <div className="rooms-list" style={{ height: '100%' }}>
          {rooms.map((room, idx) => (
            <button
              key={room.id}
              className={`room-item ${currentRoom?.id === room.id ? 'selected' : ''}`}
              onMouseMove={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                (e.currentTarget as HTMLButtonElement).style.setProperty('--rx', `${e.clientX - rect.left}px`);
                (e.currentTarget as HTMLButtonElement).style.setProperty('--ry', `${e.clientY - rect.top}px`);
              }}
              style={{
                '--i': idx,
              } as React.CSSProperties}
              onClick={() => onSelectRoom(room)}
              onDoubleClick={() => {
                navigator.clipboard.writeText(room.code);
                alert(`Room code "${room.code}" copied!`);
              }}
            >
              <div className="room-row">
                <span className="room-code">{room.code}</span>
                <span className="room-name">{room.name}</span>
              </div>
              <span className="badge" data-unread="false">0</span>
            </button>
          ))}
          {rooms.length === 0 && (
            <span style={{ opacity: 0.7, fontSize: '12px', textAlign: 'center' }}>
              No rooms yet. Create one or join one!
            </span>
          )}
        </div>
      </div>

      <div className="sidebar-section" style={{ borderTop: '1px solid #eef1f4', background: '#fbfdff' }}>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Status: {connected ? '🟢 connected' : '🔴 disconnected'}
          </span>
        </div>
        <button className="btn-primary" style={{ background: 'linear-gradient(180deg, #6b7280 0%, #4b5563 100%)' }} onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
}
