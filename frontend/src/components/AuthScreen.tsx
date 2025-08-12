import './auth.css';

interface AuthScreenProps {
  username: string;
  password: string;
  setUsername: (username: string) => void;
  setPassword: (password: string) => void;
  onLogin: () => void;
  onSignup: () => void;
}

export default function AuthScreen({
  username, password, setUsername, setPassword, onLogin, onSignup
}: AuthScreenProps) {
  return (
    <div className="auth-root">
      <div className="window">
        <div className="win-bar">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
        </div>

        <form className="glass" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
          <h1 className="title">Login</h1>

          <div className="input-box">
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            <i className="bx bxs-user" aria-hidden />
          </div>

          <div className="input-box">
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <i className="bx bxs-lock-alt" aria-hidden />
          </div>

          <div className="row">
            <label><input type="checkbox" /> Remember me</label>
            <a href="#" onClick={(e) => e.preventDefault()}>Forgot Password?</a>
          </div>

          <button className="btn" type="submit">Login</button>

          <div className="helper">
            Don’t have an account?{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); onSignup(); }}>Register</a>
          </div>
        </form>
      </div>
    </div>
  );
}
