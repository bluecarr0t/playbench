import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const shareImageAlt = "Playbench Studio";
export const shareImageSize = { width: 1200, height: 630 };
export const shareImageContentType = "image/png";

export async function createPlaybenchShareImage() {
  const [serifData, wordmark] = await Promise.all([
    readFile(join(process.cwd(), "src/lib/fonts/InstrumentSerif-Italic.ttf")),
    readFile(join(process.cwd(), "public/playbench-wordmark.png")),
  ]);

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
            alignItems: "flex-start",
          }}
        >
          <img
            src={`data:image/png;base64,${wordmark.toString("base64")}`}
            width={820}
            height={169}
          />
          <div
            style={{
              display: "flex",
              marginTop: -28,
              marginLeft: 111,
              fontFamily: "Instrument Serif",
              fontSize: 60,
              fontStyle: "italic",
              lineHeight: 1,
            }}
          >
            studio
          </div>
        </div>
      </div>
    ),
    {
      ...shareImageSize,
      fonts: [
        {
          name: "Instrument Serif",
          data: serifData,
          style: "italic",
          weight: 400,
        },
      ],
    },
  );
}
