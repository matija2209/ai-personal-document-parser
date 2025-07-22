import fs from 'fs/promises';
import path from 'path';
import { FormTemplate } from '@/lib/ai/types';

export async function buildGuestFormPrompt(
  template: FormTemplate,
  guestCount?: number
): Promise<string> {
  try {
    // Determine which prompt template to use based on template name
    let promptFile = 'guest-form-basic.txt';
    
    if (template.name.toLowerCase().includes('hotel')) {
      promptFile = 'guest-form-hotel.txt';
    } else if (template.name.toLowerCase().includes('event')) {
      promptFile = 'guest-form-event.txt';
    }

    const promptPath = path.join(process.cwd(), 'src', 'lib', 'prompts', promptFile);
    let promptTemplate = await fs.readFile(promptPath, 'utf-8');

    // Replace template variables
    promptTemplate = promptTemplate.replace(/\{\{TEMPLATE_FIELDS\}\}/g, 
      template.fields.map(field => `"${field}"`).join(', '));
    
    promptTemplate = promptTemplate.replace(/\{\{MAX_GUESTS\}\}/g, 
      template.maxGuests.toString());

    // Handle conditional guest count
    if (guestCount) {
      promptTemplate = promptTemplate.replace(/\{\{#if GUEST_COUNT\}\}/g, '');
      promptTemplate = promptTemplate.replace(/\{\{\/if\}\}/g, '');
      promptTemplate = promptTemplate.replace(/\{\{GUEST_COUNT\}\}/g, guestCount.toString());
    } else {
      // Remove conditional blocks if no guest count
      promptTemplate = promptTemplate.replace(/\{\{#if GUEST_COUNT\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    }

    // Replace field iteration in JSON format
    const fieldLines = template.fields.map(field => `      "${field}": "extracted_value_or_null"`);
    promptTemplate = promptTemplate.replace(/\{\{#each TEMPLATE_FIELDS\}\}\s*"{{this}}": "extracted_value_or_null",?\s*\{\{\/each\}\}/g, 
      fieldLines.join(',\n'));

    return promptTemplate;

  } catch (error) {
    console.error('Failed to build guest form prompt:', error);
    // Fallback to basic template
    return buildBasicGuestPrompt(template.fields, template.maxGuests, guestCount);
  }
}

function buildBasicGuestPrompt(fields: string[], maxGuests: number, guestCount?: number): string {
  const guestCountHint = guestCount ? `\n- User indicated there are approximately ${guestCount} guests on this form` : '';
  
  return `You are analyzing a guest registration form image. This is a table format where each COLUMN represents a different guest and each ROW represents a specific piece of information.

FORM STRUCTURE:
- This is a table with guests as COLUMNS (vertical layout)
- Each guest occupies one column
- Rows contain different data fields for each guest
- Fields expected: ${fields.join(', ')}
- Maximum expected guests: ${maxGuests}${guestCountHint}

EXTRACTION RULES:
1. Scan each column from left to right (Guest 1, Guest 2, Guest 3, etc.)
2. For each guest column, extract all available field values from top to bottom
3. If a field is empty, use null
4. If handwriting is unclear, use your best interpretation

Return the data in this exact JSON format:
{
  "guests": [
    {
      ${fields.map(field => `"${field}": "extracted_value_or_null"`).join(',\n      ')}
    }
  ],
  "detectedGuestCount": number_of_guests_found
}

Extract data for ALL guests visible in the image, even if some fields are empty.`;
}