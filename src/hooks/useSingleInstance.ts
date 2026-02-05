import { useEffect, useState } from 'react';

export function useSingleInstance() {
    const [isDuplicate, setIsDuplicate] = useState(false);

    useEffect(() => {
        const channel = new BroadcastChannel('entangasix-single-instance');

        // Listen for messages from other tabs
        channel.onmessage = (event) => {
            if (event.data === 'CHECK_EXISTING') {
                // Another tab opened and is asking if anyone is here.
                // We reply "I_AM_ALIVE" to tell them to block themselves.
                channel.postMessage('I_AM_ALIVE');
            } else if (event.data === 'I_AM_ALIVE') {
                // We just opened, sent 'CHECK_EXISTING', and someone replied.
                // That means we are the duplicate.
                setIsDuplicate(true);
            }
        };

        // When we mount, ask if anyone else is here
        channel.postMessage('CHECK_EXISTING');

        return () => {
            channel.close();
        };
    }, []);

    return { isDuplicate };
}
