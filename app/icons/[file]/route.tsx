import { ImageResponse } from "next/og";
import { THEME_COLOR } from "@/lib/theme-script";
import { ICONS, SPLASHES, iconSvg, type IconKind } from "../../_pwa/art";

// /icons/<file>: the installed app's PNGs (app/_pwa/art.ts lists them). All are
// made at build time from the SVG drawing, then served as static files.

export function generateStaticParams() {
  return [...ICONS, ...SPLASHES].map(({ file }) => ({ file }));
}

const dataUri = (kind: IconKind) => `data:image/svg+xml;base64,${Buffer.from(iconSvg(kind)).toString("base64")}`;

export async function GET(_request: Request, { params }: RouteContext<"/icons/[file]">) {
  const { file } = await params;

  const icon = ICONS.find((i) => i.file === file);
  if (icon) {
    // eslint-disable-next-line @next/next/no-img-element -- drawn by ImageResponse, not a page
    return new ImageResponse(<img src={dataUri(icon.kind)} width={icon.size} height={icon.size} alt="" />, {
      width: icon.size,
      height: icon.size,
    });
  }

  const splash = SPLASHES.find((s) => s.file === file);
  if (!splash) return new Response("Not found", { status: 404 }); // not in the lists: never drawn on request
  // The icon on the page colour, as if the app were already there.
  const size = Math.round(splash.width * 0.28);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: THEME_COLOR[splash.mode],
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn by ImageResponse, not a page */}
        <img src={dataUri("apple")} width={size} height={size} alt="" style={{ borderRadius: size * 0.225 }} />
      </div>
    ),
    { width: splash.width, height: splash.height },
  );
}
