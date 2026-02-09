import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Toaster, toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import AdminPanel from './components/admin/AdminPanel';
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

      // Realtime Security: Watch for Ban
      const { user } = useAuthStore.getState();
      if (user?.id) {
        const channel = supabase
          .channel(`security_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`,
            },
            async (payload: any) => {
              if (payload.new.is_banned) {
                toast.error("🚫 HAS SIDO BANEADO EN TIEMPO REAL");
                await useAuthStore.getState().logout();
              }
            }
          )
          .subscribe();

        // Cleanup listener on unmount/re-auth
        return () => {
          if (cleanup) cleanup();
          supabase.removeChannel(channel);
        };
      }
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
        const res = await fetch('/version.json?t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          const localTimestamp = localStorage.getItem('app_version_timestamp');

          if (localTimestamp && data.timestamp > localTimestamp) {
            console.log("New version detected!", data);
            // Optional: Show toast or force refresh
            // setIsUpdating(true); 
          }
          localStorage.setItem('app_version_timestamp', data.timestamp);
          const [isUpdating, setIsUpdating] = React.useState(false);

          // Forced Update Check ( aggressive: 15 seconds )
          useEffect(() => {
            const checkVersion = async () => {
              try {
                const res = await fetch('/version.json?t=' + Date.now());
                if (res.ok) {
                  const data = await res.json();
                  const localTimestamp = localStorage.getItem('app_version_timestamp');

                  if (localTimestamp && data.timestamp > localTimestamp) {
                    console.log("New version detected!", data);
                    setIsUpdating(true);
                    setTimeout(() => window.location.reload(), 2000);
                  }
                  localStorage.setItem('app_version_timestamp', data.timestamp);
                }
              } catch (e) {
                // quiet fail
              }
            };
            checkVersion();
            const interval = setInterval(checkVersion, 15000); // Every 15 seconds
            return () => clearInterval(interval);
          }, []);

          if (isUpdating) {
            return (
              <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center text-white">
                <Loader2 size={64} className="text-cyber-DEFAULT animate-spin mb-4" />
                <h1 className="text-4xl font-black animate-pulse text-center">ACTUALIZANDO SISTEMA...</h1>
                <p className="text-gray-400 mt-2">Aplicando parche divino v{Date.now().toString().slice(-4)}</p>
              </div>
            );
          }

          return (
            <BrowserRouter>
              <Toaster position="top-center" theme="dark" richColors />
              <SpeedInsights />
              <Routes>
                <Route path="/login" element={
                  isAuthenticated ? <Navigate to="/" replace /> : <Login />
                } />
                <Route path="/register" element={
                  isAuthenticated ? <Navigate to="/" replace /> : <Register />
                } />

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
                  <Route path="leaderboard/game/:gameId" element={<GameLeaderboard />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="admin" element={<AdminPanel />} />
                </Route>
              </Routes>
            </BrowserRouter>
          );
        }
