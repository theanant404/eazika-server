import { PrismaClient, User } from "../generated/prisma/client";

const prisma = new PrismaClient({
  log: ["error"],
  errorFormat: "pretty",
});

export default prisma;
export { User };
