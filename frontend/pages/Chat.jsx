import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../src/AuthContext';

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;
const GIPHY_SEARCH_URL = 'https://api.giphy.com/v1/gifs/search';

export default function Chat() {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [connection, setConnection] = useState(null);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState([]);
  const [gifError, setGifError] = useState('');
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
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

    conn.on('ReceiveMessage', (payload) => {
      setMessages((prev) => [...prev, normalizeMessage(payload)]);
    });

    conn.on('ChatHistory', (history) => {
      setMessages(history.map(normalizeMessage));
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
      await connection.invoke('SendMessage', messageText, null, 'text');
      setMessageText('');
    } catch (err) {
      console.error(err);
    }
  };

  const searchGifs = async () => {
    if (!GIPHY_API_KEY) {
      setGifError('Add meg a VITE_GIPHY_API_KEY erteket a frontend .env-ben.');
      return;
    }

    if (!gifQuery.trim()) {
      setGifError('Adj meg keresoszot a GIF keresesehez.');
      return;
    }

    setGifError('');
    setIsSearchingGifs(true);

    try {
      const params = new URLSearchParams({
        api_key: GIPHY_API_KEY,
        q: gifQuery.trim(),
        limit: '12',
        rating: 'pg-13',
      });

      const response = await fetch(`${GIPHY_SEARCH_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('A GIF kereses nem sikerult.');
      }

      const payload = await response.json();
      setGifResults(payload.data ?? []);
    } catch (error) {
      console.error(error);
      setGifError('A GIF kereses most nem sikerult.');
    } finally {
      setIsSearchingGifs(false);
    }
  };

  const sendGif = async (gif) => {
    if (!connection) {
      return;
    }

    const mediaUrl = gif?.images?.fixed_height?.url ?? gif?.images?.original?.url ?? '';
    const caption = gif?.title?.trim() ?? '';

    if (!mediaUrl) {
      setGifError('Ehhez a GIF-hez nem talaltam kuldheto kep URL-t.');
      return;
    }

    try {
      await connection.invoke('SendMessage', caption, mediaUrl, 'gif');
      setIsGifPickerOpen(false);
      setGifResults([]);
      setGifQuery('');
      setGifError('');
    } catch (error) {
      console.error(error);
      setGifError('A GIF kuldese nem sikerult.');
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
              <div className="body">
                {msg.messageType === 'gif' && msg.mediaUrl ? (
                  <div className="gif-message">
                    <img src={msg.mediaUrl} alt={msg.message || `${msg.from} GIF`} className="gif-preview" />
                    {msg.message ? <span className="gif-caption">{msg.message}</span> : null}
                  </div>
                ) : (
                  msg.message
                )}
              </div>
              <span className="time">{msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString() : ''}</span>
            </div>
          ))}
        </div>
        <div className="gif-toolbar">
          <button type="button" className="secondary" onClick={() => setIsGifPickerOpen((open) => !open)}>
            {isGifPickerOpen ? 'GIF panel bezarasa' : 'GIF kuldes'}
          </button>
          <span className="gif-attribution">Powered by GIPHY</span>
        </div>
        {isGifPickerOpen ? (
          <div className="gif-picker card">
            <div className="gif-search-row">
              <input
                value={gifQuery}
                onChange={(e) => setGifQuery(e.target.value)}
                placeholder="Keress memet vagy GIF-et"
                onKeyDown={(e) => { if (e.key === 'Enter') searchGifs(); }}
              />
              <button type="button" onClick={searchGifs} disabled={isSearchingGifs}>
                {isSearchingGifs ? 'Kereses...' : 'Kereses'}
              </button>
            </div>
            {gifError ? <div className="error">{gifError}</div> : null}
            <div className="gif-results">
              {gifResults.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  className="gif-result"
                  onClick={() => sendGif(gif)}
                >
                  <img
                    src={gif.images.fixed_width_small?.url ?? gif.images.preview_gif?.url ?? gif.images.original?.url}
                    alt={gif.title || 'GIF'}
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="input-row">
          <input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Message"
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

function normalizeMessage(message) {
  return {
    from: message?.from ?? message?.user ?? '',
    message: message?.message ?? '',
    messageType: message?.messageType ?? 'text',
    mediaUrl: message?.mediaUrl ?? null,
    sentAt: message?.sentAt ?? null,
  };
}
