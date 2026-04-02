import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/AuthContext';

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [roomError, setRoomError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchRooms();
  }, [user, navigate]);

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
      
      console.log(res);

      localStorage.setItem('currentRoom', JSON.stringify(room));
      navigate('/chat');
      
    } catch (err) {
      console.error(err);
      alert('Hálózati hiba.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Üdv, {user.userName}!</h1>
        <button className="danger" onClick={handleLogout}>Kijelentkezés</button>
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