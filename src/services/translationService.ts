import Groq from "groq-sdk";

// Initialize Groq client
const groqClient = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
});

interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
}

export async function translateText(
  text: string, 
  targetLanguage: string, 
  sourceLanguage?: string
): Promise<TranslationResult> {
  try {
    // Use a small model for efficient translation
    const model = "llama2-70b-4096";
    
    // Create prompt for translation
    const prompt = sourceLanguage 
      ? `Translate the following text from ${sourceLanguage} to ${targetLanguage}: "${text}"`
      : `Translate the following text to ${targetLanguage}: "${text}"`;
    
    const response = await groqClient.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a professional translator. Respond only with the translated text, nothing else." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });
    
    // Extract the translated text from the response
    const translatedText = response.choices[0].message.content.trim();
    
    return { 
      translatedText,
      detectedLanguage: sourceLanguage
    };
  } catch (error) {
    console.error("Translation error:", error);
    // Return original text if translation fails
    return { translatedText: text };
  }
}

// Detect language using Groq
export async function detectLanguage(text: string): Promise<string> {
  try {
    const model = "llama2-70b-4096";
    
    const response = await groqClient.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a language detection tool. Respond only with the ISO language code (e.g., 'en', 'es', 'fr', etc.)." },
        { role: "user", content: `Detect the language of this text and respond with only the ISO language code: "${text}"` }
      ],
      temperature: 0.1,
      max_tokens: 10,
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Language detection error:", error);
    return "en"; // Default to English if detection fails
  }
}
