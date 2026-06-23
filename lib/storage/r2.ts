import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const accountId = process.env.R2_ACCOUNT_ID;
const bucket = process.env.R2_BUCKET;
const publicUrl = process.env.R2_PUBLIC_URL;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

// R2 미설정 시(아직 자격증명 안 채움) 업로드를 건너뛰고 null 반환 → 사진 없이도 저장 동작.
export const isR2Configured = Boolean(
  accountId && bucket && publicUrl && accessKeyId && secretAccessKey,
);

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });
  }
  return client;
}

// 끼니 사진을 R2에 올리고 공개 URL을 반환. 미설정이면 null.
export async function uploadMealPhoto(
  body: Buffer,
  contentType: string,
): Promise<string | null> {
  if (!isR2Configured) return null;

  const ext = (contentType.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const key = `meals/${randomUUID()}.${ext}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return `${publicUrl}/${key}`;
}
