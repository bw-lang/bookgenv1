
export enum BookLength {
  TEST = 'Teste Rápido (1 Capítulo)',
  SHORT = 'Curto (aprox. 5 capítulos)',
  MEDIUM = 'Médio (aprox. 10 capítulos)',
  LONG = 'Longo (aprox. 15 capítulos)'
}

export enum BookLanguage {
  PT = 'Português',
  EN = 'English',
  ES = 'Español',
  FR = 'Français',
  DE = 'Deutsch'
}

export enum PdfTemplate {
  MODERN = 'Moderno (Design Box)',
  CLASSIC = 'Clássico & Elegante',
  MINIMAL = 'Minimalista & Clean'
}

export enum ImageFrequency {
  NONE = 'Nenhuma',
  FEW = 'Poucas (1 por capítulo)',
  MEDIUM = 'Média (A cada 3-4 parágrafos)',
  MANY = 'Muitas (A cada 2 parágrafos)',
  RANDOM = 'Aleatório'
}

export enum AIProvider {
  GEMINI = 'GEMINI (NATIVE)',
  OPENAI = 'OPENAI',
  OPENROUTER = 'OPENROUTER',
  KOALA = 'KOALA AI'
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string; // Empty for Gemini Native (uses env)
  textModel: string;
}

export const PROVIDER_MODELS = {
  [AIProvider.GEMINI]: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }
  ],
  [AIProvider.OPENAI]: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
  ],
  [AIProvider.OPENROUTER]: [
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
    { id: 'google/gemini-pro-1.5', name: 'Gemini 1.5 Pro (Via OR)' },
    { id: 'mistralai/mixtral-8x22b-instruct', name: 'Mixtral 8x22B' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' }
  ],
  [AIProvider.KOALA]: [
    { id: 'gpt-5.1', name: 'Koala (GPT-5.1)' },
    { id: 'claude-4.5-sonnet', name: 'Koala (Claude 3.5 Sonnet)' },
    { id: 'claude-4.5-haiku', name: 'Koala (Claude 3.5 Haiku)' },
    { id: 'gpt-4.1-mini', name: 'Koala (GPT-4o Mini)' }
  ]
};

export interface ChapterOutline {
  title: string;
  description: string;
}

export interface ChapterContent extends ChapterOutline {
  content: string; // Markdown formatted content
}

export interface BookData {
  id: string; // UUID for DB
  createdAt: number;
  updatedAt: number;
  
  title: string;
  authorName?: string; 
  context: string;
  length: BookLength;
  language: BookLanguage;
  imageFrequency: ImageFrequency;
  themeColor: string; // Hex code
  selectedTemplate: PdfTemplate;
  pdfFont?: 'helvetica' | 'times'; 
  outline: ChapterOutline[];
  chapters: ChapterContent[];
  coverImageBase64: string | null;
  coverOptions?: string[]; 
  backgroundImageBase64: string | null;
  backgroundOptions?: string[]; 
  contentImages: Record<string, string | null>; // Map Prompts to Base64 (or null if pending)
}

export type AppStep = 
  | 'details'
  | 'background'
  | 'color'
  | 'cover'
  | 'generation'
  | 'editor';

export type GenerationStatus = 
  | 'idle' 
  | 'generating_backgrounds'
  | 'generating_covers' 
  | 'planning' 
  | 'writing' 
  | 'generating_images' 
  | 'completed' 
  | 'error';
