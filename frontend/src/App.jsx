import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [loginError, setLoginError] = useState('');
  const { login, register, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!username.trim() || !password.trim()) {
      setLoginError('Add meg a felhasznalonevet es a jelszot.');
      return;
    }

    try {
      if (mode === 'register') {
        await register(username, password);
      } else {
        await login(username, password);
      }

      setUsername('');
      setPassword('');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setLoginError(typeof err === 'string' && err ? err : 'Sikertelen bejelentkezes.');
    }
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="card">
          <h1>Betoltes...</h1>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="app">
      <div className="card">
        <h1>{mode === 'login' ? 'Bejelentkezes' : 'Regisztracio'}</h1>
        <form onSubmit={handleSubmit}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button type="submit">
            {mode === 'login' ? 'Enter' : 'Registration'}
          </button>
        </form>
        <button
          className="secondary"
          type="button"
          onClick={() => setMode((currentMode) => currentMode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Creating a new account' : 'I already have an account'}
        </button>
        {loginError && <div className="error">{loginError}</div>}
      </div>
    </div>
  );
}

export default App;
