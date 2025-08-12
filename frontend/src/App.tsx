import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useChat } from "./hooks/useChat";
import AuthScreen from "./components/AuthScreen";
import RoomSidebar from "./components/RoomSidebar";
import ChatArea from "./components/ChatArea";

export default function App() {
  const { 
    username, 
    password, 
    token, 
    showAuth, 
    setUsername, 
    setPassword, 
    login, 
    signup, 
    logout 
  } = useAuth();

  const {
    connected,
    messages,
    rooms,
    currentRoom,
    sendChat,
    fetchHistory,
    createRoom,
    joinRoomByCode,
    selectRoom,
    clearData
  } = useChat(token);

  const [newRoomName, setNewRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [text, setText] = useState("");

  // Handle room creation
  const handleCreateRoom = async () => {
    try {
      await createRoom(newRoomName);
      setNewRoomName("");
    } catch (error) {
      alert("Failed to create room");
    }
  };

  // Handle room joining
  const handleJoinRoom = async () => {
    try {
      await joinRoomByCode(roomCode);
      setRoomCode("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to join room");
    }
  };

  // Handle chat sending
  const handleSendChat = () => {
    if (text.trim()) {
      sendChat(text);
      setText("");
    }
  };

  // Handle login
  const handleLogin = async () => {
    if (login === undefined) {
      alert("Login function not available");
      return;
    }
    
    try {
      await login();
    } catch (error) {
      alert("Login failed: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  // Handle signup
  const handleSignup = async () => {
    if (signup === undefined) {
      alert("Signup function not available");
      return;
    }
    
    try {
      await signup();
      alert("Signed up successfully! Now click Login.");
    } catch (error) {
      alert("Signup failed: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  // Handle logout
  const handleLogout = () => {
    clearData();
    logout();
  };

  // Show auth screen if not logged in
  if (showAuth) {
    return (
      <AuthScreen
        username={username}
        password={password}
        setUsername={setUsername}
        setPassword={setPassword}
        onLogin={handleLogin}
        onSignup={handleSignup}
      />
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
      <RoomSidebar
        rooms={rooms}
        currentRoom={currentRoom}
        newRoomName={newRoomName}
        roomCode={roomCode}
        connected={connected}
        setNewRoomName={setNewRoomName}
        setRoomCode={setRoomCode}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onSelectRoom={async (room) => {
          try {
            await selectRoom(room);
          } catch (error) {
            console.error("Failed to select room:", error);
          }
        }}
        onLogout={handleLogout}
      />

      {/* Right Side - Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <ChatArea
          currentRoom={currentRoom}
          messages={messages}
          text={text}
          connected={connected}
          setText={setText}
          onSendChat={handleSendChat}
          onFetchHistory={fetchHistory}
        />
      </div>
    </div>
  );
}
