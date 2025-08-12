interface AuthScreenProps {
  username: string;
  password: string;
  setUsername: (username: string) => void;
  setPassword: (password: string) => void;
  onLogin: () => void;
  onSignup: () => void;
}

export default function AuthScreen({
  username,
  password,
  setUsername,
  setPassword,
  onLogin,
  onSignup
}: AuthScreenProps) {
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
            onClick={onSignup}
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
            onClick={onLogin}
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
