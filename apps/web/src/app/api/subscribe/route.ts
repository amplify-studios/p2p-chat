let subscriptions: any[] = []; // in-memory for demo; replace with DB in production

export async function POST(req: Request) {
    const subscription = await req.json();
    subscriptions.push(subscription);
    return Response.json({ ok: true });
}

export async function GET() {
    return Response.json(subscriptions);
}

export { subscriptions }; // export for other routes
