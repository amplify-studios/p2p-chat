export async function getNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function sendNotification(title: string, body: string) {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  if (Notification.permission !== 'granted') {
    throw new Error('Notification permissions not granted');
  }

  // Try to use Service Worker if available
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.showNotification) {
        registration.showNotification(title, {
          body,
          icon: '/icon.png', // optional
          tag: 'chat-notification',
        });
        return;
      }
    } catch (err: unknown) {
      throw new Error(`SW notification failed, falling back to page notification ${err instanceof Error ? err.message : JSON.stringify(err)}`);
    }
  }

  // Fallback to normal Notification (foreground)
  const notification = new Notification(title, { body, icon: '/icon.png' });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
