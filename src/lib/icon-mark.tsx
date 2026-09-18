import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const RED = "#D32F27";
const CREAM = "#F4EBD8";

export async function createPlaybenchIcon(size: number) {
  const fontData = await readFile(
    join(process.cwd(), "src/lib/fonts/BebasNeue-Regular.ttf"),
  );
  const fontSize = Math.round(size * 0.84);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: CREAM,
          color: RED,
          fontFamily: "Bebas Neue",
          fontSize,
          lineHeight: 1,
          letterSpacing: "-0.04em",
        }}
      >
        P
      </div>
    ),
    {
      width: size,
      height: size,
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
