// 업로드 전 클라이언트 리사이즈/압축.
// - 긴 변을 maxDim 으로 줄이고 JPEG로 재인코딩 → R2 저장·분석 전송 가벼워짐.
// - canvas 재인코딩 과정에서 EXIF(위치 등)가 제거됨 = 프라이버시 보호.
// - imageOrientation: "from-image" 로 EXIF 회전은 픽셀에 반영해 사진이 눕지 않게.
export async function compressImage(
  file: File,
  maxDim = 1280,
  quality = 0.85,
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });

    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;

    return new File([blob], "meal.jpg", { type: "image/jpeg" });
  } catch {
    // 변환 실패 시 원본 그대로 (동작 우선)
    return file;
  }
}
