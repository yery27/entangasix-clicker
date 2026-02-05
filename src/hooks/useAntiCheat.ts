import { useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

const MAX_CPS = 25; // Human limit is usually around 10-15, 20 is very high. 25 is safe for legit fast clickers.
const CHECK_WINDOW_MS = 1000;

export function useAntiCheat() {
    const { logout } = useAuthStore();
    const clicksRef = useRef<number[]>([]);

    const validateClick = () => {
        const now = Date.now();

        // Add current click timestamp
        clicksRef.current.push(now);

        // Filter clicks that are older than the check window (1 second)
        clicksRef.current = clicksRef.current.filter(time => now - time < CHECK_WINDOW_MS);

        // Check CPS (Clicks Per Second)
        if (clicksRef.current.length > MAX_CPS) {
            handleCheatDetection();
            return false;
        }

        return true;
    };

    const handleCheatDetection = () => {
        // Clear clicks to prevent spamming the detection
        clicksRef.current = [];

        // Show nasty message
        toast.error('🚫 AUTOCLICK DETECTADO 🚫');
        toast.error('Tu sesión ha sido cerrada por trampas.');

        // Kick user
        setTimeout(() => {
            logout();
            window.location.reload(); // Force reload to clear state cleanly
        }, 1000);
    };

    return { validateClick };
}
