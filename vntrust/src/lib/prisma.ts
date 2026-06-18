import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import path from "path";

// Singleton pattern để tránh tạo nhiều kết nối trong hot-reload của Next.js
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbPath = path.join(process.cwd(), "dev.db").replace(/\\/g, "/");
  const adapter = new PrismaLibSql({
    url: `file:${dbPath}`
  });
  const client = new PrismaClient({ adapter });
  // Concurrency hardening: WAL cho phép đọc–ghi đồng thời (reader không chặn writer),
  // busy_timeout để chờ thay vì ném lỗi SQLITE_BUSY khi nhiều người truy cập cùng lúc.
  // Khắc phục lỗi "khi đông người truy cập hay bị lỗi". Best-effort — nuốt lỗi nếu có.
  client.$executeRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});
  client.$executeRawUnsafe("PRAGMA busy_timeout=5000;").catch(() => {});
  return client;
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
