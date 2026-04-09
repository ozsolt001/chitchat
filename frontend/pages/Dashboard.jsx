import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/AuthContext';

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [roomError, setRoomError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    const storedRoom = localStorage.getItem('currentRoom');
    if (storedRoom) {
      setSelectedRoom(JSON.parse(storedRoom));
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
    console.log('joinRoom called with:', room);

    if (!room) {
      room = localStorage.getItem('currentRoom');
      console.log('room from localStorage:', room);
      room = JSON.parse(room);
      console.log('parsed room:', room);
    }

    console.log('user:', user);

    const res = await fetch(`/api/rooms/${room.id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: user.id })
    });

    console.log('response status:', res.status);

    const text = await res.text();
    console.log('response body:', text);

    if (!res.ok) {
      throw new Error(text || 'Failed to join room');
    }

    localStorage.setItem('currentRoom', JSON.stringify(room));
    navigate('/chat');
  } catch (err) {
    console.error('joinRoom error:', err);
  }
};


  const deleteRoom = async () => {
    const roomData = localStorage.getItem('currentRoom');
    if (!roomData) {
      alert('There is no room selected.');
      return;
    }

    try {
      const room = JSON.parse(roomData);
      const res = await fetch(`/api/rooms/${room.id}?accountId=${user.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to delete room');
      }

      localStorage.removeItem('currentRoom');
      setRooms((prev) => prev.filter((currentRoom) => currentRoom.id !== room.id));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete room');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    localStorage.setItem('currentRoom', JSON.stringify(room));
  };

  if (!user) {
    return null;
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Welcome, {user.userName}!</h1>
        <button className="danger" onClick={handleLogout}>Logout</button>
      </div>

      <div className="content">
        <div className="card">
          <h2>Rooms</h2>
          <div className="room-list">
            {rooms.length === 0 && <div className="empty">There are no rooms available.</div>}
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`room ${selectedRoom?.id === room.id ? 'selected' : ''}`}
                onClick={() => handleSelectRoom(room)}
              >
                <strong>{room.name}</strong>
                <span>{room.isPrivate ? 'Privát' : 'Nyitott'}</span>
              </div>
            ))}
          </div>
          <div>
            <button type="submit" style={{ marginRight: '10px', marginTop: '10px' }} onClick={() => joinRoom()}>Enter</button>
            <button type="submit" style={{ marginRight: '10px', marginTop: '10px' }}>Creating a new room</button>
            <button type="submit" style={{ marginTop: '10px' }} onClick={() => deleteRoom()}>Deleting a room</button>
          </div>
        </div>

        <div className="card">
          <h2>Új szoba</h2>
          <form onSubmit={handleCreateRoom}>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Room name"
            />
            <button type="submit">Create a room</button>
            {roomError && <div className="error">{roomError}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}
