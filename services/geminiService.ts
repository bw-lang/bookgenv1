import { GoogleGenAI, Type } from "@google/genai";
import { BookLength, ChapterOutline, BookLanguage, ImageFrequency } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image'; 

export const generateBookOutline = async (title: string, context: string, length: BookLength, language: BookLanguage): Promise<ChapterOutline[]> => {
  let numChapters = 5;
  if (length === BookLength.MEDIUM) numChapters = 10;
  if (length === BookLength.LONG) numChapters = 15;

  const prompt = `
    Act as an experienced book editor.
    Create an outline for a book in the language: "${language}".
    Book Title: "${title}".
    Context: "${context}".
    The book must have approximately ${numChapters} chapters.
    Return ONLY a JSON array of chapters, where each chapter has a 'title' and a brief 'description' of what will be covered.
  `;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Falha ao gerar o esboço do livro.");
  
  return JSON.parse(text) as ChapterOutline[];
};

export const generateChapterContent = async (bookTitle: string, chapterTitle: string, chapterDesc: string, context: string, language: BookLanguage, imgFreq: ImageFrequency): Promise<string> => {
  
  let imgInstruction = "";
  switch (imgFreq) {
    case ImageFrequency.NONE: imgInstruction = "Do NOT insert any image tags."; break;
    case ImageFrequency.FEW: imgInstruction = "Insert exactly ONE image tag `[IMAGE_PROMPT: visual description]` somewhere in the middle of the chapter."; break;
    case ImageFrequency.MEDIUM: imgInstruction = "Insert an image tag `[IMAGE_PROMPT: visual description]` approximately every 3-4 paragraphs."; break;
    case ImageFrequency.MANY: imgInstruction = "Insert an image tag `[IMAGE_PROMPT: visual description]` frequently, every 2 paragraphs."; break;
    case ImageFrequency.RANDOM: imgInstruction = "Randomly decide to insert between 0 to 3 image tags `[IMAGE_PROMPT: visual description]`."; break;
  }

  const prompt = `
    Write the full content for a book chapter in the language: "${language}".
    Book Title: "${bookTitle}"
    General Context: "${context}"
    
    Current Chapter: "${chapterTitle}"
    Chapter Description: "${chapterDesc}"
    
    **CRITICAL FORMATTING RULES FOR PDF GENERATION:**
    1. Use '## ' (double hash) for subtitles. Example: ## Introduction
    2. Use '**text**' for bold emphasis. Example: This is **important**.
    3. Use '- ' for bullet lists. 
    4. Do NOT use # for the main title (it is auto-generated).
    5. **IMAGES**: ${imgInstruction}
    6. **NO DIAGRAMS**: Do not attempt to draw diagrams or use [DIAGRAM] tags.
    
    Write engaging, educational, and professional text. Keep paragraphs moderate in length.
  `;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
  });

  return response.text || "Conteúdo não gerado.";
};

export const generateBookCoverOptions = async (title: string, context: string, refinement?: string): Promise<string[]> => {
  const refinementText = refinement ? `User specific refinement request: ${refinement}` : "";
  const prompt = `
    Create a cinematic, high-quality book cover.
    Book Title: "${title}"
    Genre/Theme: "${context}"
    ${refinementText}
    The image must contain the title text written artistically and legibly in the center or top.
    Style: Professional, vibrant, digital art 4k.
  `;

  const promises = [
    ai.models.generateContent({ model: IMAGE_MODEL, contents: prompt + " Variation: Minimalist, clean typography." }),
    ai.models.generateContent({ model: IMAGE_MODEL, contents: prompt + " Variation: Detailed illustration, rich colors." }),
    ai.models.generateContent({ model: IMAGE_MODEL, contents: prompt + " Variation: Abstract and modern." })
  ];

  const responses = await Promise.all(promises);
  return responses.map(r => extractImageFromResponse(r));
};

export const generateInternalImage = async (imagePrompt: string, styleContext: string): Promise<string> => {
  const fullPrompt = `
    Create a rectangular book illustration (landscape ratio 16:9).
    Subject: ${imagePrompt}
    Style context: ${styleContext}.
    Style: Engraving style, clean lines, professional textbook illustration.
    No text in the image. White background preferred.
  `;
  
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: fullPrompt,
  });
  
  return extractImageFromResponse(response);
}

export const generatePageBackgroundOptions = async (title: string, context: string, refinement?: string): Promise<string[]> => {
  const refinementText = refinement ? `User specific refinement request: ${refinement}` : "";
  const prompt = `
    Create a background texture image for a book page (A4 ratio).
    Theme: "${context}" based on "${title}".
    ${refinementText}
    CRITICAL: The center of the image MUST be very light/white/transparent looking so text can be read over it.
    Elements: Place subtle, faint, artistic elements ONLY on the margins/borders.
    Style: Watermark style, paper texture, low contrast, high brightness, very subtle.
    No text in the image.
  `;

  const promises = [
    ai.models.generateContent({ model: IMAGE_MODEL, contents: prompt + " Variation: Geometric" }),
    ai.models.generateContent({ model: IMAGE_MODEL, contents: prompt + " Variation: Organic/Nature" }),
    ai.models.generateContent({ model: IMAGE_MODEL, contents: prompt + " Variation: Classic Paper" })
  ];

  const responses = await Promise.all(promises);
  return responses.map(r => extractImageFromResponse(r));
};

const extractImageFromResponse = (response: any): string => {
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }
  throw new Error("Não foi possível gerar a imagem.");
};