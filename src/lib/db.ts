import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createClient() {
  const envUrl = process.env.DATABASE_URL || "file:./dev.db";
  let sqlitePath = envUrl.replace(/^file:/, "");
  if (!path.isAbsolute(sqlitePath)) {
    sqlitePath = path.join(process.cwd(), sqlitePath);
  }

  const adapter = new PrismaBetterSqlite3({
    url: `file:${sqlitePath}`,
  });
  return new PrismaClient({ adapter, log: ["error", "warn"] });
}

export const prisma = globalForPrisma.prisma || createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
