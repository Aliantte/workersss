import { NextResponse } from "next/server";
import { getFeed } from "@/lib/redis";

export async function GET() {
  try {
    const items = await getFeed(40);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ items: [], error: String(err) }, { status: 200 });
  }
}
