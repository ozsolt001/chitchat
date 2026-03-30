import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

function App() {
  const [stage, setStage] = useState('login');
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [roomError, setRoomError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    if (stage === 'dashboard') {
      fetchRooms();
    }
  }, [stage]);

  useEffect(() => {
    if (currentRoom && user) {
      const conn = new signalR.HubConnectionBuilder()
        .withUrl('/chatHub')
        .withAutomaticReconnect()
        .build();

      conn.on('ReceiveMessage', (from, message, sentAt) => {
        setMessages((prev) => [...prev, { from, message, sentAt }]);
      });

      conn.on('ChatHistory', (history) => {
        setMessages(history);
      });

      conn.start().then(() => {
        console.log('SignalR connected');
      }).catch((err) => console.error(err));

      setConnection(conn);

      return () => {
        conn.stop().catch(() => {});
      };
    }
  }, [currentRoom, user]);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Failed to fetch rooms');
      const data = await res.json();
      setRooms(data);
    } catch (err) {
      console.error(err);
    }
  };

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
      setUser(account);
      setUsername('');
      setStage('dashboard');
    } catch (err) {
      console.error(err);
      setLoginError('Hálózati hiba.');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setRoomError('');

    if (!roomName.trim()) {
      setRoomError('Adj meg szoba nevet!');
      return;
    }

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName, isPrivate: false, creatorAccountId: user.id })
      });
      if (!res.ok) {
        setRoomError('Nem sikerült létrehozni');
        return;
      }

      const room = await res.json();
      setRoomName('');
      setRooms((prev) => [...prev, room]);
      joinRoom(room);
    } catch (err) {
      console.error(err);
      setRoomError('Szerver hiba.');
    }
  };

  const joinRoom = async (room) => {
    try {
      const res = await fetch(`/api/rooms/${room.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: user.id })
      });

      if (!res.ok) {
        if (res.status === 409) alert('Már tagja vagy a szobának.');
        else alert('Nem sikerült csatlakozni.');
        return;
      }

      setCurrentRoom(room);
      setMessages([]);
      setStage('chat');
    } catch (err) {
      console.error(err);
      alert('Hálózati hiba.');
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !connection) return;
    try {
      await connection.invoke('SendMessage', user.userName, messageText);
      setMessageText('');
    } catch (err) {
      console.error(err);
    }
  };

  const logOut = () => {
    if (connection) connection.stop();
    setConnection(null);
    setCurrentRoom(null);
    setUser(null);
    setStage('login');
    setMessages([]);
  };

  if (stage === 'login') {
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

  if (stage === 'dashboard') {
    return (
      <div className="app">
        <div className="header">
          <h1>Üdv, {user.userName}!</h1>
          <button className="danger" onClick={logOut}>Kijelentkezés</button>
        </div>

        <div className="content">
          <div className="card">
            <h2>Szobák</h2>
            <div className="room-list">
              {rooms.length === 0 && <div className="empty">Nincsenek szobák</div>}
              {rooms.map((room) => (
                <div key={room.id} className="room" onClick={() => joinRoom(room)}>
                  <strong>{room.name}</strong>
                  <span>{room.isPrivate ? 'Privát' : 'Nyitott'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Új szoba</h2>
            <form onSubmit={handleCreateRoom}>
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Szoba neve"
              />
              <button type="submit">Létrehozás</button>
              {roomError && <div className="error">{roomError}</div>}
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'chat') {
    return (
      <div className="app">
        <div className="header">
          <h1>{currentRoom.name}</h1>
          <button className="secondary" onClick={() => setStage('dashboard')}>Vissza</button>
          <button className="danger" onClick={logOut}>Kijelentkezés</button>
        </div>
        <div className="chat-panel">
          <div className="messages">
            {messages.map((msg, idx) => (
              <div key={idx} className="message">
                <span className="from">{msg.from}</span>
                <span className="body">{msg.message}</span>
                <span className="time">{msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString() : ''}</span>
              </div>
            ))}
          </div>
          <div className="input-row">
            <input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Üzenet"
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
            />
            <button onClick={sendMessage}>Küldés</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
