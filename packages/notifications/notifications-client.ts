export const NotificationsClient = {
    async requestPermission() {
        if (!("Notification" in window)) return false;
        if (Notification.permission === "granted") return true;
        const perm = await Notification.requestPermission();
        return perm === "granted";
    },

    async registerServiceWorker() {
        if (!("serviceWorker" in navigator)) return null;
        const reg = await navigator.serviceWorker.register("/sw.js");
        return reg;
    },

    async subscribe(vapidPublicKey: string) {
        const registration = await navigator.serviceWorker.ready;
        const converted = urlBase64ToUint8Array(vapidPublicKey);
        return await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: converted,
        });
    },
};

function urlBase64ToUint8Array(base64: string) {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const base64Clean = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64Clean);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i)
        outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}
