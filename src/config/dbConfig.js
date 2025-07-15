import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"], errorFormat: "pretty" });

export default prisma;
