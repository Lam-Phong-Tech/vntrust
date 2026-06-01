import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    
    // Allow updating trangThaiXacMinh or other fields
    const updated = await prisma.ketQuaHauKiem.update({
      where: { id },
      data: body,
    });
    
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`PUT /api/haukiem update error:`, error);
    return NextResponse.json({ error: "Lỗi Server" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;
    await prisma.ketQuaHauKiem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`DELETE /api/haukiem delete error:`, error);
    return NextResponse.json({ error: "Lỗi Server" }, { status: 500 });
  }
}

