import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth";

// PUT ? ch? admin
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authErr = requireRoles(request, ['admin'])
  if (authErr) return authErr

  try {
    const params = await context.params;
    const { id } = params;
    const body = await request.json();

    const updated = await prisma.ketQuaHauKiem.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`PUT /api/haukiem update error:`, error);
    return NextResponse.json({ error: "L?i Server" }, { status: 500 });
  }
}

// DELETE ? ch? admin
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authErr = requireRoles(request, ['admin'])
  if (authErr) return authErr

  try {
    const params = await context.params;
    const { id } = params;
    await prisma.ketQuaHauKiem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`DELETE /api/haukiem delete error:`, error);
    return NextResponse.json({ error: "L?i Server" }, { status: 500 });
  }
}
