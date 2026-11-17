const trim = (value: string) => value.replace(/\/+$/, "");
const DEFAULT_ORIGIN = "https://api.rezide.in";
export const API_BASE_URL = trim(process.env.NEXT_PUBLIC_API_BASE_URL || `${DEFAULT_ORIGIN}/v1/admin`);
export const API_SERVER_BASE_URL = trim(process.env.API_SERVER_BASE_URL || (API_BASE_URL.startsWith("/") ? `${DEFAULT_ORIGIN}/v1/admin` : API_BASE_URL));
export const apiOrigin = () => trim(process.env.API_ORIGIN || new URL(API_SERVER_BASE_URL).origin);
export const publicApiOrigin = () => new URL(API_BASE_URL, typeof window === "undefined" ? DEFAULT_ORIGIN : window.location.origin).origin;
export const CDN_ORIGIN = trim(process.env.NEXT_PUBLIC_CDN_ORIGIN || "https://cdn.rezide.in");
export const uploadUrl = (key: string) => key ? `${typeof window === "undefined" ? apiOrigin() : publicApiOrigin()}/v1/admin/file/upload/${encodeURIComponent(key)}` : "";
