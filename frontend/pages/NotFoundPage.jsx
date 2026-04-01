import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>404 - Nem található</h1>
      <p>A keresett oldal nem létezik.</p>
      <Link to="/">Vissza a főoldalra</Link>
    </div>
  );
}

export default NotFoundPage;