import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/AuthContext';
import { MASCOT_OPTIONS, PROFILE_COLORS } from '../src/profileOptions';

export default function Profile() {
  const { user, isLoading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [profileColor, setProfileColor] = useState(user?.profileColor ?? PROFILE_COLORS[0]);
  const [mascot, setMascot] = useState(user?.mascot ?? MASCOT_OPTIONS[0]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      setProfileColor(user.profileColor ?? PROFILE_COLORS[0]);
      setMascot(user.mascot ?? MASCOT_OPTIONS[0]);
    }
  }, [user]);

  if (isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('');

    try {
      await updateProfile(profileColor, mascot);
      setStatus('A profil sikeresen frissult.');
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Nem sikerult menteni a profilt.');
    }
  };

  return (
    <div className="app">
      <div className="header">
        <h1>Your profile</h1>
        <button className="secondary" onClick={() => navigate('/dashboard')}>Back</button>
      </div>

      <div className="card profile-page-card">
        <div className="profile-summary">
          <span className="profile-badge large" style={{ backgroundColor: profileColor }}>
            {mascot}
          </span>
          <div>
            <h2>{user.userName}</h2>
            <p>Change your mascot and profile color any time.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="picker-group">
            <span className="picker-label">Color</span>
            <div className="color-options">
              {PROFILE_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`color-swatch ${profileColor === option ? 'selected' : ''}`}
                  style={{ backgroundColor: option }}
                  onClick={() => setProfileColor(option)}
                  aria-label={`Select ${option}`}
                />
              ))}
            </div>
          </div>

          <div className="picker-group">
            <span className="picker-label">Mascot</span>
            <div className="mascot-options">
              {MASCOT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`mascot-option ${mascot === option ? 'selected' : ''}`}
                  onClick={() => setMascot(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <button type="submit">Save profile</button>
        </form>

        {status ? <div className="status-text">{status}</div> : null}
      </div>
    </div>
  );
}
