import { AutoProcessor, MultiModalityCausalLM } from "@huggingface/transformers";

// Cache for the model and processor to avoid reloading
let processorCache: any = null;
let modelCache: any = null;

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  try {
    // Initialize model and processor if not already loaded
    if (!processorCache || !modelCache) {
      const model_id = "onnx-community/Janus-Pro-1B-ONNX";
      processorCache = await AutoProcessor.from_pretrained(model_id);
      modelCache = await MultiModalityCausalLM.from_pretrained(model_id);
    }

    // Prepare inputs for translation
    const conversation = [
      {
        role: "<|User|>",
        content: `Translate the following text to ${targetLanguage}: "${text}"`,
      },
    ];
    
    const inputs = await processorCache(conversation);

    // Generate translation
    const outputs = await modelCache.generate({
      ...inputs,
      max_new_tokens: 250,
      do_sample: false,
    });

    // Decode output
    const new_tokens = outputs.slice(null, [inputs.input_ids.dims.at(-1), null]);
    const decoded = processorCache.batch_decode(new_tokens, { skip_special_tokens: true });
    
    return decoded[0];
  } catch (error) {
    console.error("Translation error:", error);
    // Return original text if translation fails
    return text;
  }
}

// Get browser language in a format suitable for translation
export function getBrowserLanguage(): string {
  const browserLang = navigator.language || (navigator as any).userLanguage;
  // Extract main language code (e.g., 'en-US' -> 'English')
  const languageMap: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    // Add more languages as needed
  };
  
  const langCode = browserLang.split('-')[0];
  return languageMap[langCode] || 'English'; // Default to English if not found
}
