export async function getNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// send a notification using the Service Worker
export async function sendNotification(title: string, body: string) {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported, fallback to normal Notification');
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  if (!registration.showNotification) {
    console.warn('showNotification not available, fallback to normal Notification');
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }

  registration.showNotification(title, {
    body,
    tag: 'chat-notification',
    // icon: '/icon.png',
  });
}
