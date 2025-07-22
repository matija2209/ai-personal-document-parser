export const getPromptForDocument = (documentType: 'passport' | 'driving-license' | 'guest-form'): string => {
  const basePrompt = `You are an expert document data extraction AI. Analyze the image of the document provided. Extract the key information and return it ONLY as a valid JSON object. Do not include any other text or markdown formatting.`;

  if (documentType === 'passport') {
    return `${basePrompt} The required fields are: "firstName", "lastName", "documentNumber", "dateOfBirth", "expiryDate", "nationality".`;
  }
  if (documentType === 'driving-license') {
    return `${basePrompt} The required fields are: "firstName", "lastName", "documentNumber", "dateOfBirth", "expiryDate", "address", "vehicleClasses".`;
  }
  throw new Error("Invalid document type");
};