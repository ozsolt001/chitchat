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
      .withUrl('/chatHub', {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .build();

    conn.on('ReceiveMessage', (from, message, sentAt) => {
      setMessages((prev) => [...prev, { from, message, sentAt }]);
    });

    conn.on('ChatHistory', (history) => {
      setMessages(history.map((msg) => ({
        from: msg.from ?? msg.user ?? '',
        message: msg.message ?? '',
        sentAt: msg.sentAt ?? null,
      })));
    });

    let active = true;
    const startConnection = async () => {
      try {
        await conn.start();
        console.log('SignalR connected');
        await conn.invoke('JoinRoom', room.id, user.id);
        if (active) {
          setConnection(conn);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('SignalR connection failed:', err);
      }
    };

    startConnection();

    return () => {
      active = false;
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
