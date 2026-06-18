import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const enterprises = await prisma.doanhNghiep.findMany({
      select: {
        id: true,
        ten: true,
        maSoThue: true,
        trangThai: true,
        ngayDangKy: true
      },
      orderBy: {
        ngayDangKy: 'desc'
      }
    });

    // We augment the data with deterministic risk metrics 
    // based on the enterprise ID or maSoThue to keep it consistent on reload.
    // In a production system, these would be aggregated from CanhBao, MaDinhDanh, ChungNhan tables.
    
    const augmentedData = enterprises.map((e, index) => {
      // Simple pseudo-random generators based on index/id for demonstration
      const hash1 = (e.maSoThue.charCodeAt(0) || 1) + index;
      const hash2 = (e.maSoThue.charCodeAt(e.maSoThue.length - 1) || 1) + index;
      
      const riskScore = (hash1 * 13) % 100;
      const complaintCount = (hash2 * 17) % 300;
      const qrFraud = (hash1 * 7) % 50;
      const expiredCert = (hash2 % 5 === 0);
      const aiSimilarity = ((hash1 * hash2) % 100) + "%";
      
      let geoRisk = "Low";
      if (riskScore > 70) geoRisk = "High";
      else if (riskScore > 40) geoRisk = "Medium";

      return {
        id: e.id,
        name: e.ten,
        taxCode: e.maSoThue,
        riskScore,
        complaintCount,
        qrFraud,
        expiredCert,
        aiSimilarity,
        geoRisk,
      };
    });

    // Sort by riskScore descending
    augmentedData.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json({ success: true, data: augmentedData });
  } catch (error: any) {
    console.error("Enterprise Risk API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
