import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { requireAuth, requireRoles, getRole } from "@/lib/auth";

// GET ? d?ng cookie ?? x?c ??nh scope, kh?ng tin query param
export async function GET(req: NextRequest) {
  const authErr = requireAuth(req)
  if (authErr) return authErr

  try {
    const role = getRole(req)!

    // Admin xem t?t c?; c?c role kh?c ch? xem log c?a role m?nh
    const where = role === "admin" ? {} : { role }

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

// POST ? ch? user ?? ??ng nh?p m?i ???c ghi log
export async function POST(req: NextRequest) {
  const authErr = requireAuth(req)
  if (authErr) return authErr

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
