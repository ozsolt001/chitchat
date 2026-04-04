import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../src/AuthContext';

export default function Chat() {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [connection, setConnection] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // Get current room from localStorage or redirect to dashboard
    const roomData = localStorage.getItem('currentRoom');
    if (!roomData) {
      navigate('/dashboard');
      return;
    }

    const room = JSON.parse(roomData);
    setCurrentRoom(room);

    // Setup SignalR connection
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
      // Join the room after connecting
      return conn.invoke('JoinRoom', room.Id, user.Id);
    }).then(() => {
      console.log('Joined room');
    }).catch((err) => console.error(err));

    setConnection(conn);

    return () => {
      conn.stop().catch(() => {});
    };
  }, [user, navigate]);

  const sendMessage = async () => {
    if (!messageText.trim() || !connection) return;
    try {
      await connection.invoke('SendMessage', messageText);
      setMessageText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleBack = () => {
    localStorage.removeItem('currentRoom');
    navigate('/dashboard');
  };

  const handleLogout = () => {
    if (connection) connection.stop();
    logout();
    navigate('/');
  };

  if (!user || !currentRoom) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app">
      <div className="header">
        <h1>{currentRoom.name}</h1>
        <button className="secondary" onClick={handleBack}>Back</button>
        <button className="danger" onClick={handleLogout}>Logout</button>
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