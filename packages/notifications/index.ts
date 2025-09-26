// import { Notification } from 'notifications';

export function getNotificationPermission() {
  return new Promise((resolve, reject) => {
    if (Notification.permission === 'granted') {
      resolve(true);
      return;
    } else if (Notification.permission === 'denied') {
      resolve(false);
      return;
    }

    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

export function sendNotification(title: string, body: string) {
  if (Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification(title, {
    body,
  });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
