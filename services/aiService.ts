import { GoogleGenAI, Type } from "@google/genai";
import { BookLength, ChapterOutline, BookLanguage, ImageFrequency, AIConfig, AIProvider } from "../types";

const nativeAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

// --- HELPERS ---

// Helper to switch between Native SDK and Rest APIs
const generateText = async (config: AIConfig, systemPrompt: string, userPrompt: string, jsonSchema?: any): Promise<string> => {
  
  // 1. GEMINI NATIVE
  if (config.provider === AIProvider.GEMINI) {
    const model = config.textModel || GEMINI_TEXT_MODEL;
    const response = await nativeAi.models.generateContent({
      model: model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: jsonSchema ? "application/json" : "text/plain",
        responseSchema: jsonSchema
      }
    });
    return response.text || "";
  }

  // 2. KOALA AI
  if (config.provider === AIProvider.KOALA) {
    const apiKey = config.apiKey;
    if (!apiKey) throw new Error("Koala API Key is missing.");

    // Koala uses a single 'input' field. We combine system and user prompt.
    const combinedInput = `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\nUSER REQUEST:\n${userPrompt}\n\n${jsonSchema ? "RETURN ONLY RAW JSON." : ""}`;

    const body: any = {
        input: combinedInput,
        model: config.textModel || 'gpt-5.1',
        realTimeData: false // Optimization for speed/cost unless needed
    };

    const response = await fetch("https://koala.sh/api/gpt/", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || `Koala API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.output || "";
  }

  // 3. OPENAI / OPENROUTER
  const isOpenRouter = config.provider === AIProvider.OPENROUTER;
  const baseUrl = isOpenRouter ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1";
  const apiKey = config.apiKey;

  if (!apiKey) throw new Error(`${config.provider} API Key is missing in settings.`);

  const headers: any = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  if (isOpenRouter) {
    headers["HTTP-Referer"] = window.location.origin;
    headers["X-Title"] = "BookGen AI";
  }

  const body: any = {
    model: config.textModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7
  };

  if (jsonSchema && config.provider === AIProvider.OPENAI) {
     body.response_format = { type: "json_object" };
     body.messages[0].content += " RETURN JSON ONLY."; 
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
};

const generatePollinationsImage = async (prompt: string, width: number, height: number): Promise<string> => {
    // Pollinations.ai is a free fallback that doesn't require an API key
    const safePrompt = encodeURIComponent(prompt.substring(0, 500)); 
    const url = `https://image.pollinations.ai/prompt/${safePrompt}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
    
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        throw new Error("Failed to generate image via fallback provider.");
    }
};

const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const generateImage = async (config: AIConfig, prompt: string, isCover = false): Promise<string> => {
  // Dimensions
  const width = isCover ? 768 : 1200;
  const height = isCover ? 1024 : 800; // A4 Ratio vs 3:2 Landscape

  // 1. OPENAI (DALL-E 3)
  if (config.provider === AIProvider.OPENAI && config.apiKey) {
    try {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: isCover ? "1024x1792" : "1024x1024",
                response_format: "b64_json",
                quality: "standard"
            })
        });
        
        if (!response.ok) throw new Error("OpenAI Image Error");
        const data = await response.json();
        return data.data[0].b64_json;
    } catch (e) {
        console.warn("OpenAI Image failed, trying fallback...", e);
        return generatePollinationsImage(prompt, width, height);
    }
  }

  // 2. KOALA AI IMAGES
  if (config.provider === AIProvider.KOALA && config.apiKey) {
    try {
        // Based on Koala API standards
        const response = await fetch("https://koala.sh/api/images", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                prompt: prompt,
                model: "premium", // or standard
                size: isCover ? "portrait" : "landscape",
                style: "illustration", 
                num_images: 1
            })
        });

        if (!response.ok) throw new Error("Koala Images API Error");
        const data = await response.json();
        const imageUrl = data.output?.[0] || data.output; // Koala typically returns URL
        
        if (imageUrl) {
            return await urlToBase64(imageUrl);
        }
        throw new Error("No image URL returned by Koala");

    } catch (e) {
        console.warn("Koala Image failed, trying fallback...", e);
        return generatePollinationsImage(prompt, width, height);
    }
  }

  // 3. GEMINI NATIVE (Primary for Gemini users)
  if (config.provider === AIProvider.GEMINI) {
      try {
        const response = await nativeAi.models.generateContent({
            model: GEMINI_IMAGE_MODEL,
            contents: prompt,
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return part.inlineData.data;
        }
        throw new Error("No image generated by Gemini.");
      } catch (e: any) {
          console.warn("Gemini Image failed (likely quota), trying fallback...", e);
          return generatePollinationsImage(prompt, width, height);
      }
  }

  // 4. OPENROUTER (Default to Pollinations)
  return generatePollinationsImage(prompt, width, height);
};


// --- EXPORTED SERVICES ---

export const generateBookOutline = async (config: AIConfig, title: string, context: string, length: BookLength, language: BookLanguage): Promise<ChapterOutline[]> => {
  let numChapters = 5;
  if (length === BookLength.TEST) numChapters = 1;
  else if (length === BookLength.MEDIUM) numChapters = 10;
  else if (length === BookLength.LONG) numChapters = 15;

  const system = `Act as an experienced book editor. You are creating a detailed outline.`;
  const user = `
    Create an outline for a book in the language: "${language}".
    Book Title: "${title}".
    Context: "${context}".
    The book must have approximately ${numChapters} chapters.
    Return ONLY a JSON array of chapters, where each chapter has a 'title' and a brief 'description' of what will be covered.
    Keep chapter titles concise (under 10 words).
    Example format: [{"title": "...", "description": "..."}]
  `;

  // Gemini Schema for strict typing (used if provider is Gemini)
  const geminiSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING }
      },
      required: ["title", "description"]
    }
  };

  const text = await generateText(config, system, user, config.provider === AIProvider.GEMINI ? geminiSchema : true);
  
  try {
     // Clean up markdown code blocks often returned by LLMs
     const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
     return JSON.parse(cleanText) as ChapterOutline[];
  } catch (e) {
      throw new Error("Falha ao processar o formato JSON do esboço.");
  }
};

export const generateChapterContent = async (config: AIConfig, bookTitle: string, chapterTitle: string, chapterDesc: string, context: string, language: BookLanguage, imgFreq: ImageFrequency): Promise<string> => {
  
  let imgInstruction = "";
  switch (imgFreq) {
    case ImageFrequency.NONE: imgInstruction = "Do NOT insert any image tags."; break;
    case ImageFrequency.FEW: imgInstruction = "Insert exactly ONE image tag `[IMAGE_PROMPT: visual description]` somewhere in the middle of the chapter."; break;
    case ImageFrequency.MEDIUM: imgInstruction = "Insert an image tag `[IMAGE_PROMPT: visual description]` approximately every 3-4 paragraphs."; break;
    case ImageFrequency.MANY: imgInstruction = "Insert an image tag `[IMAGE_PROMPT: visual description]` frequently, every 2 paragraphs."; break;
    case ImageFrequency.RANDOM: imgInstruction = "Randomly decide to insert between 0 to 3 image tags `[IMAGE_PROMPT: visual description]`."; break;
  }

  const system = `You are a professional book ghostwriter writing in ${language}.`;
  let writingInstruction = `
    2. Write in **depth**. Each subtitle/section must have at least **3 full paragraphs**.
  `;
  
  const user = `
    Write the full content for a book chapter.
    Book Title: "${bookTitle}"
    General Context: "${context}"
    
    Current Chapter: "${chapterTitle}"
    Chapter Description: "${chapterDesc}"
    
    **CRITICAL WRITING INSTRUCTIONS:**
    1. **DO NOT** repeat the Chapter Title at the beginning. Start directly with the content.
    ${writingInstruction}
    3. **Avoid bulleted lists**. Use prose and paragraphs primarily.
    
    **CRITICAL FORMATTING RULES FOR PDF GENERATION:**
    1. Use '## ' (double hash) for subtitles. Example: ## Introduction
    2. Use '**text**' for bold emphasis. Example: This is **important**.
    3. Use '- ' for bullet lists. 
    4. **IMAGES**: ${imgInstruction}
    5. **NO DIAGRAMS**.
    
    Write engaging, educational, and professional text.
    If the context implies a 'Test' or 'Short' generation, keep it concise (1 paragraph per section).
  `;

  return await generateText(config, system, user);
};

export const generateBookCoverOptions = async (config: AIConfig, title: string, context: string, refinement?: string): Promise<string[]> => {
  const refinementText = refinement ? `User specific refinement request: ${refinement}` : "";
  const basePrompt = `
    Create a cinematic, high-quality book cover.
    Aspect Ratio: Vertical A4 (210mm x 297mm).
    Book Title: "${title}"
    Genre/Theme: "${context}"
    ${refinementText}
    The image must contain the title text written artistically and legibly in the center or top.
    Style: Professional, vibrant, digital art 4k.
  `;

  const prompts = [
     basePrompt + " Variation: Minimalist, clean typography.",
     basePrompt + " Variation: Detailed illustration, rich colors.",
     basePrompt + " Variation: Abstract and modern."
  ];

  const results = await Promise.all(prompts.map(p => generateImage(config, p, true)));
  return results;
};

export const generateInternalImage = async (config: AIConfig, imagePrompt: string, styleContext: string): Promise<string> => {
  const fullPrompt = `
    Create a rectangular book illustration (Landscape Aspect Ratio 3:2).
    Subject: ${imagePrompt}
    Style context: ${styleContext}.
    Style: Engraving style, clean lines, professional textbook illustration.
    No text in the image. White background preferred.
  `;
  return await generateImage(config, fullPrompt);
}

export const generatePageBackgroundOptions = async (config: AIConfig, title: string, context: string, refinement?: string): Promise<string[]> => {
  const refinementText = refinement ? `User specific refinement request: ${refinement}` : "";
  const basePrompt = `
    Create a background texture image for a book page (A4 ratio).
    Theme: "${context}" based on "${title}".
    ${refinementText}
    CRITICAL: The center of the image MUST be very light/white/transparent looking so text can be read over it.
    Elements: Place subtle, faint, artistic elements ONLY on the margins/borders.
    Style: Watermark style, paper texture, low contrast, high brightness, very subtle.
    No text in the image.
  `;

  const prompts = [
    basePrompt + " Variation: Geometric",
    basePrompt + " Variation: Organic/Nature",
    basePrompt + " Variation: Classic Paper"
 ];

 const results = await Promise.all(prompts.map(p => generateImage(config, p)));
 return results;
};