/* eslint-disable no-console */
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = "demo@chronos.local";
  const password = await bcrypt.hash("demo12345", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Demo User", password },
  });

  console.log("Seeded user:", { id: user.id, email: user.email });
  console.log('Login with: { "email": "demo@chronos.local", "password": "demo12345" }');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
