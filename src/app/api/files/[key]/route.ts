import { apiOrigin } from "@/lib/api/origins";

/**
 * GET /api/files/{key}
 *
 * A backend upload (e.g. a developer logo), re-served with the right image Content-Type.
 * The backend sends uploads with no Content-Type, and browsers won't show an SVG in an <img>
 * without `image/svg+xml` (Lodha Group's logo is an SVG). Only images are passed on.
 */

const KEY = /^[a-f0-9]{16,64}$/i;

/** The image type, from the file's first bytes. */
function sniff(bytes: Uint8Array): string | null {
  const head = (n: number) => Array.from(bytes.slice(0, n));
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts([0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (starts([0x52, 0x49, 0x46, 0x46]) && String.fromCharCode(...head(12).slice(8)) === "WEBP") return "image/webp";
  const text = new TextDecoder().decode(bytes.slice(0, 512)).trimStart().toLowerCase();
  if (text.startsWith("<svg") || (text.startsWith("<?xml") && text.includes("<svg"))) return "image/svg+xml";
  return null;
}

export async function GET(_request: Request, { params }: RouteContext<"/api/files/[key]">) {
  const { key } = await params;
  if (!KEY.test(key)) return new Response("Not found", { status: 404 });
  try {
    const upstream = await fetch(`${apiOrigin()}/v1/admin/file/upload/${key}`);
    if (!upstream.ok) return new Response("Not found", { status: 404 });
    const body = new Uint8Array(await upstream.arrayBuffer());
    const type = sniff(body);
    if (!type) return new Response("Not an image", { status: 415 });
    return new Response(body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        // An SVG opened on its own must not run scripts on this site.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new Response("Upstream error", { status: 502 });
  }
}
