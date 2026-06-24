import "server-only";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

// 구독에 알림 발송. 구독이 만료/취소된 경우(410/404) false를 반환해
// 호출부가 DB에서 정리할 수 있게 한다.
export async function sendPush(
  sub: PushSubscriptionRow,
  payload: { title: string; body: string; url?: string },
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return true;
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) return false;
    throw err;
  }
}
