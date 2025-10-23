// import webpush from "web-push";

// webpush.setVapidDetails(
//     "mailto:admin@example.com",
//     process.env.VAPID_PUBLIC_KEY!,
//     process.env.VAPID_PRIVATE_KEY!
// );

// export async function sendPushNotification(subscription: any, payload: { title: string; body: string }) {
//     await webpush.sendNotification(subscription, JSON.stringify(payload));
// }

// lib/notifications-server.ts
import webpush from 'web-push';

// Initialize VAPID keys
export function initVapid(mailto: string) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    throw new Error(
      'Missing VAPID keys. Make sure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set in .env.local',
    );
  }

  webpush.setVapidDetails(
    `mailto:${mailto}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

// Send a push notification to a single subscription
export async function sendPush(
  subscription: webpush.PushSubscription | any,
  payload: { title: string; body: string },
) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to send push notification:', err);
  }
}
