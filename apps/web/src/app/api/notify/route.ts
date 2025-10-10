// // import { in } from "@chat/notifications/notifications-server";
// // import { subscriptions } from "../subscribe/route";

// // NotificationsServer.initVapid("admin@example.com");

// // export async function POST(req: Request) {
// //     const { title, body } = await req.json();

// //     for (const sub of subscriptions) {
// //         try {
// //             await NotificationsServer.sendPush(sub, { title, body });
// //         } catch (err) {
// //             console.error("Push failed", err);
// //         }
// //     }

// //     return Response.json({ ok: true });
// // }


// // Example API route
// import { initVapid, sendPush } from "@chat/notifications/notifications-server";
// import { subscriptions } from "../subscribe/route";

// initVapid("admin@example.com");

// export async function POST(req: Request) {
//     const { title, body } = await req.json();
//     for (const sub of subscriptions) {
//         console.log(sub);
//         await sendPush(sub, { title, body });
//     }
//     return Response.json({ ok: true });
// }
