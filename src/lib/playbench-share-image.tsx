import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const shareImageAlt = "Playbench Studio Works";
export const shareImageSize = { width: 1200, height: 630 };
export const shareImageContentType = "image/png";

export async function createPlaybenchShareImage() {
  const fontData = await readFile(
    join(process.cwd(), "src/lib/fonts/BebasNeue-Regular.ttf"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#F4EBD8",
          color: "#D32F27",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontFamily: "Bebas Neue",
            lineHeight: 0.86,
            letterSpacing: "-0.02em",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 148 }}>Playbench</div>
          <div style={{ display: "flex", fontSize: 92, marginTop: 18 }}>
            Studio Works
          </div>
        </div>
      </div>
    ),
    {
      ...shareImageSize,
      fonts: [
        {
          name: "Bebas Neue",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
