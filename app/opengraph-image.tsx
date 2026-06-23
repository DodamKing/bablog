import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

// 카톡/SNS 공유 미리보기 (Phase 1.5). D14 톤: 크림 배경 + 밥공기 마스코트 + Jua 워드마크.
export const alt = "밥로그 — 사진 한 장으로 끼니 기록";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 구글폰트에서 TTF 받아오기(satori는 woff2 미지원 → node UA로 ttf 응답 유도).
async function loadFont(family: string, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);
  if (!src) throw new Error(`font load failed: ${family}`);
  return (await fetch(src[1])).arrayBuffer();
}

export default async function OpengraphImage() {
  const WORDMARK = "밥로그";
  const TAGLINE = "사진 한 장으로 끼니 기록";

  const mascot = readFileSync(join(process.cwd(), "assets/brand/mascot-clean.png"));
  const mascotSrc = `data:image/png;base64,${mascot.toString("base64")}`;

  const [jua, noto] = await Promise.all([
    loadFont("Jua", WORDMARK),
    loadFont("Noto+Sans+KR:wght@700", TAGLINE),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
          background: "#FFF8F0",
          padding: 64,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mascotSrc} width={360} height={413} alt="" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Jua", fontSize: 150, color: "#3A332E", lineHeight: 1 }}>
            {WORDMARK}
          </div>
          <div
            style={{
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ width: 44, height: 10, borderRadius: 5, background: "#FF8A6B" }} />
            <div style={{ fontFamily: "Noto", fontSize: 40, color: "#7A7066" }}>
              {TAGLINE}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Jua", data: jua, weight: 400, style: "normal" },
        { name: "Noto", data: noto, weight: 700, style: "normal" },
      ],
    },
  );
}
