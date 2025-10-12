// export async function getNotificationPermission(): Promise<boolean> {
//   if (!('Notification' in window)) return false;

//   if (Notification.permission === 'granted') return true;
//   if (Notification.permission === 'denied') return false;

//   const permission = await Notification.requestPermission();
//   return permission === 'granted';
// }

// export async function sendNotification(title: string, body: string) {
//   if (!('Notification' in window)) {
//     throw new Error('Notifications not supported');
//   }

//   if (Notification.permission !== 'granted') {
//     throw new Error('Notification permissions not granted');
//   }

//   // Try to use Service Worker if available
//   if ('serviceWorker' in navigator) {
//     try {
//       const registration = await navigator.serviceWorker.getRegistration();
//       if (registration?.showNotification) {
//         registration.showNotification(title, {
//           body,
//           icon: '/icon.png', // optional
//           tag: 'chat-notification',
//         });
//         return;
//       }
//     } catch (err: unknown) {
//       throw new Error(
//         `SW notification failed, falling back to page notification ${err instanceof Error ? err.message : JSON.stringify(err)}`,
//       );
//     }
//   }

//   const notification = new Notification(title, { body, icon: '/icon.png' });
//   notification.onclick = () => {
//     window.focus();
//     notification.close();
//   };
// }

// export * from './notifications-client';
// export * from './notifications-server';

/**
 * Handles local notifications on both desktop and mobile browsers.
 * Works standalone — no server, no push, just client-side notifications.
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!("serviceWorker" in navigator)) return null;
    try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        return reg;
    } catch (err) {
        console.error("Failed to register service worker:", err);
        return null;
    }
}

export function hasNotifictationPermission(): boolean {
    if (!("Notification" in window)) return false;
    return Notification.permission === "granted";
}

export async function requestNotificationPermission(retry: boolean = false): Promise<boolean> {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const permission = await Notification.requestPermission();
    return permission === "granted";
}

/**
 * Sends a local notification that works on desktop and mobile.
 * Uses `registration.showNotification()` when needed.
 */
export async function sendLocalNotification(title: string, body: string) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") {
        console.warn("Notification permission not granted");
        return;
    }

    // Prefer Service Worker API on mobile
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && reg.showNotification) {
        reg.showNotification(title, {
            body,
            icon: "/icon.png", // optional
        });
        return;
    }

    // Fallback for desktop browsers
    new Notification(title, { body, icon: "/icon.png" });
}
