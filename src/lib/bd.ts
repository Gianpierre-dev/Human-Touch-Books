import { PrismaClient } from "@prisma/client";

// Singleton: evita agotar conexiones al recargar en desarrollo.
const globalConPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const bd = globalConPrisma.prisma ?? new PrismaClient();

if (import.meta.env.DEV) {
  globalConPrisma.prisma = bd;
}
