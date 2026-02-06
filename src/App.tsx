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
import GameLeaderboard from './pages/GameLeaderboard';
import Profile from './pages/Profile';
import { useAuthStore } from './stores/authStore';
import { useGameStore } from './stores/gameStore';
import GlobalEvents from './components/GlobalEvents';
import { SpeedInsights } from "@vercel/speed-insights/react";

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

  // Forced Update Check
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch('/version.json?t=' + Date.now());
        if (!response.ok) return;
        const data = await response.json();
        const currentVersion = localStorage.getItem('app_version');

        if (currentVersion && currentVersion !== data.version) {
          // New version detected!
          console.log('🔄 New version detected. Reloading...');
          localStorage.setItem('app_version', data.version);
          // Clear cache and reload
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
              for (let registration of registrations) {
                registration.unregister();
              }
            });
          }
          window.location.reload();
        } else if (!currentVersion) {
          // First load or storage cleared, set version
          localStorage.setItem('app_version', data.version);
        }
      } catch (error) {
        // Silent fail (offline or dev)
        console.warn('Version check failed', error);
      }
    };

    // Check version every 30 seconds
    const interval = setInterval(checkVersion, 30000);
    // Initial check
    checkVersion();

    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors theme="dark" />
      <SpeedInsights />
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
          <Route path="game-leaderboard" element={<GameLeaderboard />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
