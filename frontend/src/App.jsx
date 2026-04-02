import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function App() {
  const [username, setUsername] = useState('');
  const [loginError, setLoginError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!username.trim()) {
      setLoginError('Adj meg felhasználónevet!');
      return;
    }

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: username })
      });

      if (!res.ok) {
        if (res.status === 409) setLoginError('A felhasználónév foglalt.');
        else setLoginError('Hiba történt.');
        return;
      }

      const account = await res.json();
      login(account);
      setUsername('');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setLoginError('Hálózati hiba.');
    }
  };

  // If user is logged in, redirect to dashboard
  if (user) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="app">
      <div className="card">
        <h1>Login</h1>
        <form onSubmit={handleLogin}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Felhasználónév"
          />
          <button type="submit">Belépés</button>
        </form>
        {loginError && <div className="error">{loginError}</div>}
      </div>
    </div>
  );
}

export default App;
