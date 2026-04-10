import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './AuthContext';
import './index.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import DashboardItems from '../pages/DashboardItems';
import Chat from '../pages/Chat';
import NotFoundPage from '../pages/NotFoundPage';
import Profile from '../pages/Profile';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/dashboard/:id', element: <DashboardItems /> },
  { path: '/chat', element: <Chat /> },
  { path: '/profile', element: <Profile /> },
  { path: '*', element: <NotFoundPage /> },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
