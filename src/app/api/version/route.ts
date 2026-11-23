import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** The build the server runs now; an open app compares it with its own to offer "Atualizar". */
export function GET() {
  return NextResponse.json(
    { build: `${process.env.NEXT_PUBLIC_APP_COMMIT ?? ""}-${process.env.NEXT_PUBLIC_APP_BUILT_AT ?? ""}` },
    { headers: { "Cache-Control": "no-store" } },
  );
}
