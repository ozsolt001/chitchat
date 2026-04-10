import { useEffect, useRef, useState } from 'react';
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
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingStartedAtRef = useRef(null);
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
      setMessages((prev) => [...prev, normalizeMessage(payload, user)]);
    });

    conn.on('ChatHistory', (history) => {
      setMessages(history.map((message) => normalizeMessage(message, user)));
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
      if (mediaRecorderRef.current?.state && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [user, navigate, isLoading]);

  useEffect(() => {
    if (!isRecordingAudio) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isRecordingAudio]);

  const sendMessage = async () => {
    if (!messageText.trim() || !connection) {
      return;
    }

    try {
      await connection.invoke('SendMessage', messageText, null, 'text', null);
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
      await connection.invoke('SendMessage', caption, mediaUrl, 'gif', null);
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

  const toggleAudioRecording = async () => {
    if (isRecordingAudio) {
      stopAudioRecording();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setAudioError('A bongeszod nem tamogatja a hangrogzitest.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
          ? 'audio/ogg'
          : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blobType = recorder.mimeType || chunks[0]?.type || 'audio/webm';
        const audioBlob = new Blob(chunks, { type: blobType });
        const durationMs = recordingStartedAtRef.current
          ? Date.now() - recordingStartedAtRef.current
          : null;

        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        recordingStartedAtRef.current = null;
        setIsRecordingAudio(false);
        setRecordingSeconds(0);

        if (audioBlob.size === 0) {
          setAudioError('Nem sikerult hangot rogzitni.');
          return;
        }

        await uploadAudioMessage(audioBlob, durationMs ?? undefined);
      };

      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      setAudioError('');
      setRecordingSeconds(0);
      setIsRecordingAudio(true);
      recorder.start();
    } catch (error) {
      console.error(error);
      setAudioError('A mikrofonhoz valo hozzaferes nem sikerult.');
    }
  };

  const stopAudioRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const uploadAudioMessage = async (audioBlob, durationMs) => {
    if (!currentRoom) {
      return;
    }

    try {
      const extension = audioBlob.type.includes('ogg') ? 'ogg' : audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
      const formData = new FormData();
      formData.append('roomId', String(currentRoom.id));
      formData.append('durationMs', String(durationMs));
      formData.append('audio', audioBlob, `voice-message.${extension}`);

      const response = await fetch('/api/audio-messages', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'A hanguzenet feltoltese nem sikerult.');
      }

      setAudioError('');
    } catch (error) {
      console.error(error);
      setAudioError(error instanceof Error ? error.message : 'A hanguzenet feltoltese nem sikerult.');
    }
  };

  if (isLoading || !user || !currentRoom) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app chat-page">
      <div className="header">
        <h1>{currentRoom.name}</h1>
        <button className="secondary" onClick={handleBack}>Back</button>
        <button className="danger" onClick={handleLogout}>Logout</button>
      </div>
      <div className="chat-panel">
        <div className="messages">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.isOwnMessage ? 'own-message' : ''}`}
              style={{
                background: msg.profileColor ? `${msg.profileColor}20` : undefined,
                boxShadow: msg.profileColor ? `inset 0 0 0 1px ${msg.profileColor}55` : undefined,
              }}
            >
              <div className="from-block">
                {msg.mascot ? (
                  <span className="message-mascot" style={{ backgroundColor: msg.profileColor || '#4f8cff' }}>
                    {msg.mascot}
                  </span>
                ) : null}
                <span className="from">{msg.from}</span>
              </div>
              <div className="body">
                {msg.messageType === 'gif' && msg.mediaUrl ? (
                  <div className="gif-message">
                    <img src={msg.mediaUrl} alt={msg.message || `${msg.from} GIF`} className="gif-preview" />
                    {msg.message ? <span className="gif-caption">{msg.message}</span> : null}
                  </div>
                ) : msg.messageType === 'audio' && msg.mediaUrl ? (
                  <div className="audio-message">
                    <audio controls preload="metadata" src={msg.mediaUrl} className="audio-player" />
                    <div className="audio-meta">
                      <span>Hanguzenet</span>
                      {msg.durationMs ? <span>{formatDuration(msg.durationMs)}</span> : null}
                    </div>
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
          <button type="button" className={isRecordingAudio ? 'danger' : 'secondary'} onClick={toggleAudioRecording}>
            {isRecordingAudio ? `Felvetel leallitasa (${recordingSeconds}s)` : 'Hangfelvetel'}
          </button>
          <span className="gif-attribution">Powered by GIPHY</span>
        </div>
        {audioError ? <div className="error">{audioError}</div> : null}
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

function normalizeMessage(message, currentUser = null) {
  return {
    from: message?.from ?? message?.user ?? '',
    message: message?.message ?? '',
    messageType: message?.messageType ?? 'text',
    mediaUrl: message?.mediaUrl ?? null,
    durationMs: message?.durationMs ?? null,
    profileColor: message?.profileColor ?? '#4f8cff',
    mascot: message?.mascot ?? '',
    isOwnMessage: currentUser?.userName === (message?.from ?? message?.user ?? ''),
    sentAt: message?.sentAt ?? null,
  };
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
