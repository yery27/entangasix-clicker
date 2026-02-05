import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from './components/layout/AppShell';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Shop from './pages/Shop';
import Casino from './pages/Casino';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import { useAuthStore } from './stores/authStore';
import { useGameStore } from './stores/gameStore';
import GlobalEvents from './components/GlobalEvents';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { tick, loadGame } = useGameStore();
  const { checkSession, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    if (isAuthenticated) {
      loadGame();
      const init = async () => {
        const fn = await useGameStore.getState().initializeSync();
        if (active) {
          cleanup = fn;
        } else if (fn) {
          fn();
        }
      };
      init();
    }

    return () => {
      active = false;
      if (cleanup) cleanup();

      // Attempt to save on unmount/close
      useGameStore.getState().saveGame();
    };
  }, [isAuthenticated, loadGame]);

  // Game Loop
  useEffect(() => {
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors theme="dark" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={
          <ProtectedRoute>
            <GlobalEvents />
            <AppShell />
          </ProtectedRoute>
        }>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="casino" element={<Casino />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
