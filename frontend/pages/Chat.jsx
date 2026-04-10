import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../src/AuthContext';

export default function Chat() {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [connection, setConnection] = useState(null);
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      navigate('/');
      return;
    }

    const roomData = localStorage.getItem('currentRoom');
    if (!roomData) {
      navigate('/dashboard');
      return;
    }

    const room = JSON.parse(roomData);
    setCurrentRoom(room);

    const conn = new signalR.HubConnectionBuilder()
      .withUrl('/chatHub', {
        withCredentials: true,
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
        await conn.invoke('JoinRoom', room.id);

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
  }, [user, navigate, isLoading]);

  const sendMessage = async () => {
    if (!messageText.trim() || !connection) {
      return;
    }

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
    if (connection) {
      connection.stop();
    }

    logout().finally(() => navigate('/'));
  };

  if (isLoading || !user || !currentRoom) {
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
            placeholder="Uzenet"
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
          />
          <button onClick={sendMessage}>Kuldes</button>
        </div>
      </div>
    </div>
  );
}
