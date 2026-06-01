import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "";
    
    // Admin sees all. Others only see their own logs.
    const where = role === "admin" ? {} : { role };
    
    const logs = await prisma.nhatKy.findMany({
      where,
      orderBy: { time: "desc" },
      take: 100
    });
    
    return NextResponse.json({ logs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ logs: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const log = await prisma.nhatKy.create({
      data: {
        action: body.action || "Unknown action",
        user: body.user || "Unknown user",
        role: body.role || "user",
        ip: body.ip || "Unknown IP",
        status: body.status || "info",
      }
    });
    return NextResponse.json({ log });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create log" }, { status: 500 });
  }
}
