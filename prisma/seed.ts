import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a sample user
  await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: '$2a$12$examplehash', // bcrypt hash placeholder
      role: 'USER',
      verified: true,
      preferences: {
        create: {
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
          debugMode: false,
          llmModel: 'claude-3-sonnet',
          llmTemp: 0.7,
          maxTokens: 1000,
        },
      },
    },
  });
  // Add more sample data as needed
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
