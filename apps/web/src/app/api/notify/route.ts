import { sendPushNotification } from "@chat/notifications/notifications-server";
import { subscriptions } from "../subscribe/route";

export async function POST(req: Request) {
    const { title, body } = await req.json();

    for (const sub of subscriptions) {
        try {
            sendPushNotification(sub, { title, body });
        } catch (e) {
            console.error("Failed to send push:", e);
        }
    }

    return Response.json({ ok: true });
}
