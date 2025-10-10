'use client';

import { useEffect } from 'react';
import { NotificationsClient } from '@chat/notifications/notifications-client';

export default function NotificationInit() {
    useEffect(() => {
        async function init() {
            const granted = await NotificationsClient.requestPermission();
            if (!granted) return;

            await NotificationsClient.registerServiceWorker();

            const subscription = await NotificationsClient.subscribe(
                process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
            );

            // Send subscription to server
            await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription),
            });
        }

        init();
    }, []);
}
