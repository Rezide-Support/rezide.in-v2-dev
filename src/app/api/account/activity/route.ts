/** Disabled until account identity can be derived from a backend-verified session. */
export async function GET() {
  return Response.json({ message: "Account activity is currently unavailable." }, { status: 404, headers: { "Cache-Control": "no-store" } });
}