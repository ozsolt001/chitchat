import { useParams } from 'react-router-dom';

export default function DashboardItems() {
  const { id } = useParams();

  return (
    <div>
      <h1>Dashboard Items - Room {id}</h1>
    </div>
  );
}