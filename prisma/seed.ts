import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default form templates...');

  // Check if templates already exist
  const existingTemplates = await prisma.formTemplate.count();
  
  if (existingTemplates > 0) {
    console.log('Templates already exist, skipping seed');
    return;
  }

  const defaultTemplates = [
    {
      name: 'Basic Guest Registration',
      description: '5-guest table with: first name, last name, birth date, country, document type, document ID',
      fields: ['firstName', 'lastName', 'birthDate', 'country', 'documentType', 'documentId'],
      maxGuests: 5,
    },
    {
      name: 'Hotel Check-in Form',
      description: '5-guest table with: first name, last name, document ID, country, room assignment',
      fields: ['firstName', 'lastName', 'documentId', 'country', 'roomNumber'],
      maxGuests: 5,
    },
    {
      name: 'Event Registration',
      description: '3-guest table with: full name, email, phone number',
      fields: ['fullName', 'email', 'phoneNumber'],
      maxGuests: 3,
    },
  ];

  for (const template of defaultTemplates) {
    await prisma.formTemplate.create({
      data: template,
    });
    console.log(`Created template: ${template.name}`);
  }

  console.log('Default form templates created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });