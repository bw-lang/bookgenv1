
import React, { useState, useEffect, useRef } from 'react';
import { Book, Loader2, ArrowRight, Check, Layout, RefreshCw, Settings, X, Server, Key, Cpu, Bold, Heading, List, Image as ImageIcon, Moon, Sun, ChevronRight, FileText, Palette, PenTool, Download, Eye, Dices, Sparkles, Box, Type, Upload, Pencil, Library, Trash2, Copy, Edit3, ArrowLeft, Save } from 'lucide-react';
import { BookLength, BookData, ChapterContent, GenerationStatus, BookLanguage, PdfTemplate, AppStep, ImageFrequency, AIConfig, AIProvider, PROVIDER_MODELS } from './types';
import * as AIService from './services/aiService';
import * as StorageService from './services/storageService';
import { generateBookPDF } from './services/pdfService';
import { generateBookEPUB } from './services/epubService';

const THEME_COLORS = [
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Slate', hex: '#475569' },
];

const RANDOM_IDEAS = [
    { title: "Digital Nomad Survival", context: "A guide to working remotely from anywhere, managing finances, and staying productive while traveling.", lang: BookLanguage.EN },
    { title: "Sobrevivência Urbana", context: "Técnicas essenciais de preparação, segurança e primeiros socorros para cenários de crise em grandes cidades.", lang: BookLanguage.PT },
    { title: "The Art of Stoicism", context: "Modern application of ancient philosophy. How to remain calm in a chaotic world.", lang: BookLanguage.EN },
    { title: "Receitas da Vovó", context: "Um livro de culinária afetiva com pratos tradicionais brasileiros e histórias de família.", lang: BookLanguage.PT },
    { title: "AI Revolution 2030", context: "A speculative look at how Artificial Intelligence will reshape healthcare, transport, and daily life.", lang: BookLanguage.EN }
];

// --- COMPONENTS ---

const JasperCard = ({ children, className, onClick, active }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white border border-gray-200 p-6 relative overflow-hidden transition-all duration-300
    ${active ? 'ring-2 ring-black shadow-hard' : 'hover:shadow-lg'}
    ${className}
    `}
  >
    {children}
  </div>
);

const NavStep = ({ label, active, done, index, onClick }: any) => (
  <button 
    onClick={onClick}
    disabled={!done && !active}
    className={`group flex items-center gap-4 w-full p-4 text-left transition-all border-l-2
      ${active 
        ? 'border-black bg-white shadow-sm' 
        : done 
            ? 'border-jasper-lime bg-transparent opacity-60 hover:opacity-100' 
            : 'border-transparent opacity-40 cursor-not-allowed'
      }`}
  >
      <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border transition-colors
         ${active ? 'bg-black text-white border-black' : 
           done ? 'bg-jasper-lime text-black border-jasper-lime' : 'border-gray-300 text-gray-400'}
      `}>
          {done ? <Check size={16} /> : index}
      </div>
      <span className={`font-serif text-lg ${active ? 'font-semibold text-black' : 'text-gray-600'}`}>
        {label}
      </span>
  </button>
);

const JasperInput = ({ label, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            {label}
        </label>
        <input 
            className="w-full bg-transparent border-b-2 border-gray-200 px-2 py-3 text-lg font-serif text-gray-900 focus:border-black focus:bg-white outline-none transition-all placeholder:text-gray-300 placeholder:font-sans" 
            {...props} 
        />
    </div>
);

const JasperSelect = ({ label, children, ...props }: any) => (
  <div className="space-y-2">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          {label}
      </label>
      <div className="relative">
          <select className="w-full bg-white border border-gray-200 rounded-none px-4 py-3 text-sm font-medium text-gray-900 focus:ring-1 focus:ring-black outline-none transition-all appearance-none cursor-pointer" {...props}>
              {children}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <ChevronRight size={16} className="rotate-90" />
          </div>
      </div>
  </div>
);

const JasperToggle = ({ label, checked, onChange, helpText }: any) => (
    <div className="flex items-start gap-4 p-4 border border-gray-200 bg-white">
        <button 
            onClick={() => onChange(!checked)}
            className={`mt-1 w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-black' : 'bg-gray-200'}`}
        >
            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
        <div>
            <div className="font-bold text-sm uppercase tracking-wider">{label}</div>
            {helpText && <div className="text-xs text-gray-400 mt-1">{helpText}</div>}
        </div>
    </div>
);

const PrimaryButton = ({ children, onClick, disabled, loading, icon: Icon, className, variant = 'primary' }: any) => (
    <button 
        onClick={onClick} 
        disabled={disabled || loading}
        className={`relative w-full flex items-center justify-center gap-3 px-8 py-4 font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed
            ${variant === 'secondary' 
            ? 'bg-white border-2 border-gray-200 hover:border-black text-black'
            : 'bg-black text-white hover:bg-gray-800 shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
            } 
            ${className}`}
    >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {!loading && Icon && <Icon size={18} />}
        <span>{children}</span>
    </button>
);

const IconButton = ({ children, onClick, active }: any) => (
    <button 
        onClick={onClick} 
        className={`p-2 transition-colors rounded-sm ${
            active 
            ? 'bg-jasper-lime text-black shadow-hard-sm' 
            : 'text-gray-500 hover:bg-gray-100 hover:text-black'
        }`}
    >
        {children}
    </button>
);

const App: React.FC = () => {
  // App View State
  const [view, setView] = useState<'library' | 'wizard'>('library');
  const [library, setLibrary] = useState<BookData[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Input State
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [length, setLength] = useState<BookLength>(BookLength.SHORT);
  const [language, setLanguage] = useState<BookLanguage>(BookLanguage.PT);
  const [imageFrequency, setImageFrequency] = useState<ImageFrequency>(ImageFrequency.MEDIUM);
  
  // New Toggles
  const [isTextOnly, setIsTextOnly] = useState(false);
  const [isDeferredImages, setIsDeferredImages] = useState(true);

  // AI Configuration
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: AIProvider.GEMINI,
    apiKey: '',
    textModel: PROVIDER_MODELS[AIProvider.GEMINI][0].id
  });
  const [showConfig, setShowConfig] = useState(false);

  // App Flow State
  const [step, setStep] = useState<AppStep>('details');
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  
  // Refinement State
  const [bgRefinement, setBgRefinement] = useState('');
  const [coverRefinement, setCoverRefinement] = useState('');

  // Data State
  const [bookData, setBookData] = useState<BookData | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [pendingImageGen, setPendingImageGen] = useState<string | null>(null);

  // --- LIFECYCLE & STORAGE ---

  useEffect(() => {
      loadLibrary();
  }, []);

  const loadLibrary = async () => {
      try {
          const books = await StorageService.getAllBooks();
          setLibrary(books);
      } catch (e) {
          console.error("Failed to load library", e);
      }
  };

  // Autosave logic
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
      if (view === 'wizard' && bookData && bookData.id) {
          setIsSaving(true);
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          
          saveTimeoutRef.current = setTimeout(async () => {
              try {
                  await StorageService.saveBook(bookData);
                  setIsSaving(false);
                  loadLibrary(); // Update library in bg
              } catch (e) {
                  console.error("Autosave failed", e);
                  setIsSaving(false);
              }
          }, 2000); // 2 seconds debounce
      }
  }, [bookData, view]);

  // --- ACTIONS ---

  const createNewBook = () => {
      setTitle('');
      setContext('');
      setLanguage(BookLanguage.PT);
      setBookData(null);
      setStep('details');
      setView('wizard');
  };

  const openBook = (book: BookData) => {
      setBookData(book);
      // Determine step based on data completeness
      if (book.chapters.length > 0) setStep('editor');
      else if (book.coverOptions) setStep('cover');
      else if (book.backgroundOptions) setStep('background');
      else setStep('details');
      
      // Populate Form State for consistency if user goes back
      setTitle(book.title);
      setContext(book.context);
      setLanguage(book.language);
      setLength(book.length);
      setImageFrequency(book.imageFrequency);
      
      setView('wizard');
  };

  const deleteBook = async (e: any, id: string) => {
      e.stopPropagation();
      if(confirm("Are you sure you want to delete this book?")) {
          await StorageService.deleteBook(id);
          loadLibrary();
      }
  };

  const cloneBook = async (e: any, book: BookData) => {
      e.stopPropagation();
      await StorageService.duplicateBook(book);
      loadLibrary();
  }

  const handleProviderChange = (provider: AIProvider) => {
    setAiConfig({
      provider,
      apiKey: provider === AIProvider.GEMINI ? '' : aiConfig.apiKey,
      textModel: PROVIDER_MODELS[provider][0].id
    });
  };

  const randomizeBook = () => {
      const rand = RANDOM_IDEAS[Math.floor(Math.random() * RANDOM_IDEAS.length)];
      setTitle(rand.title);
      setContext(rand.context);
      setLanguage(rand.lang);
  };

  const generateBackgrounds = async (isRegen = false) => {
    if(!title || !context) return;
    setStatus('generating_backgrounds');
    setProgressLabel('Generating textures...');
    setProgress(30);
    setError(null);
    
    try {
      const bgs = await AIService.generatePageBackgroundOptions(aiConfig, title, context, bgRefinement);
      
      const newBook: BookData = bookData ? { ...bookData, backgroundOptions: bgs } : {
         id: crypto.randomUUID(),
         createdAt: Date.now(),
         updatedAt: Date.now(),
         title, context, length, language, imageFrequency,
         themeColor: THEME_COLORS[1].hex, 
         selectedTemplate: PdfTemplate.MODERN,
         outline: [], chapters: [],
         coverImageBase64: null, backgroundImageBase64: null,
         backgroundOptions: bgs,
         contentImages: {},
         authorName: '', 
         pdfFont: 'helvetica'
      };

      setBookData(newBook);
      setStep('background');
      setStatus('idle');
      if(!isRegen) setBgRefinement('');
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
    }
  };

  const startTextOnlyMode = () => {
      const initialData: BookData = {
         id: crypto.randomUUID(),
         createdAt: Date.now(),
         updatedAt: Date.now(),
         title, context, length, language, 
         imageFrequency: ImageFrequency.NONE,
         themeColor: THEME_COLORS[1].hex,
         selectedTemplate: PdfTemplate.MODERN,
         outline: [], chapters: [],
         coverImageBase64: null, backgroundImageBase64: null,
         contentImages: {},
         authorName: '',
         pdfFont: 'helvetica'
      };
      setBookData(initialData);
      startWriting(initialData);
  };

  const skipBackground = () => {
    setBookData(prev => prev ? ({ ...prev, backgroundImageBase64: null }) : null);
    setStep('color');
  };

  const selectBackground = (bg: string | null) => {
    if (!bookData) return;
    setBookData({ ...bookData, backgroundImageBase64: bg });
    setStep('color');
  };

  const selectColor = (hex: string) => {
    if (!bookData) return;
    setBookData({ ...bookData, themeColor: hex });
    generateCovers({ ...bookData, themeColor: hex });
  };

  const generateCovers = async (currentBook: BookData, isRegen = false) => {
    setStatus('generating_covers');
    setProgressLabel(isRegen ? 'Regenerating visuals...' : 'Designing covers...');
    setProgress(50);
    setError(null);
    try {
      const covers = await AIService.generateBookCoverOptions(aiConfig, currentBook.title, currentBook.context, coverRefinement);
      setBookData({ ...currentBook, coverOptions: covers });
      setStep('cover');
      setStatus('idle');
      if (!isRegen) setCoverRefinement('');
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
    }
  };

  const skipCover = () => {
    if (!bookData) return;
    const updated = { ...bookData, coverImageBase64: null };
    setBookData(updated);
    startWriting(updated);
  };

  const selectCover = (cover: string) => {
    if (!bookData) return;
    const updated = { ...bookData, coverImageBase64: cover };
    setBookData(updated);
    startWriting(updated);
  };

  const startWriting = async (currentBook: BookData) => {
    setStep('generation');
    setStatus('planning');
    setProgressLabel('Planning structure...');
    setProgress(10);
    setError(null);

    try {
      // Save initial state before heavy lifting
      await StorageService.saveBook(currentBook);

      const outline = await AIService.generateBookOutline(aiConfig, currentBook.title, currentBook.context, currentBook.length, currentBook.language);
      
      setStatus('writing');
      const chapters: ChapterContent[] = [];
      const total = outline.length;

      for (let i = 0; i < total; i++) {
        const item = outline[i];
        const pct = 20 + Math.floor((i / total) * 50);
        setProgress(pct);
        setProgressLabel(`Writing: ${item.title}...`);
        
        const content = await AIService.generateChapterContent(aiConfig, currentBook.title, item.title, item.description, currentBook.context, currentBook.language, currentBook.imageFrequency);
        chapters.push({ ...item, content });
      }

      // Images Logic
      const newImages: Record<string, string | null> = {};
      const prompts: string[] = [];
      
      chapters.forEach(c => {
        const matches = c.content.match(/\[IMAGE_PROMPT:\s*(.*?)\]/g);
        if (matches) prompts.push(...matches);
      });

      prompts.forEach(p => newImages[p] = null);

      if (prompts.length > 0 && !isDeferredImages && currentBook.imageFrequency !== ImageFrequency.NONE) {
          setStatus('generating_images');
          setProgress(80);
          setProgressLabel('Drawing illustrations...');
          
          for (let j = 0; j < prompts.length; j++) {
             const raw = prompts[j];
             const clean = raw.replace('[IMAGE_PROMPT:', '').replace(']', '').trim();
             setProgress(80 + Math.floor((j / prompts.length) * 20));
             setProgressLabel(`Illustrating: ${clean.substring(0, 20)}...`);
             try {
                const b64 = await AIService.generateInternalImage(aiConfig, clean, currentBook.context);
                newImages[raw] = b64;
             } catch(e) {}
          }
      }

      setBookData({ ...currentBook, outline, chapters, contentImages: newImages });
      setStep('editor');
      setStatus('completed');
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
    }
  };

  const generateSingleImage = async (tag: string) => {
      if (!bookData) return;
      setPendingImageGen(tag);
      const clean = tag.replace('[IMAGE_PROMPT:', '').replace(']', '').trim();
      try {
         const b64 = await AIService.generateInternalImage(aiConfig, clean, bookData.context);
         setBookData(prev => prev ? ({
             ...prev,
             contentImages: { ...prev.contentImages, [tag]: b64 }
         }) : null);
      } catch(e) {
          alert("Failed to generate image.");
      } finally {
          setPendingImageGen(null);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !bookData) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          const b64 = (reader.result as string).split(',')[1];
          const tagId = `[IMAGE_PROMPT: USER_UPLOAD_${Date.now()}]`;
          
          // Insert Tag into Text
          const textarea = document.getElementById('chapter-editor') as HTMLTextAreaElement;
          if (textarea) {
              const start = textarea.selectionStart;
              const text = bookData.chapters[activeChapterIndex].content;
              const newText = text.substring(0, start) + `\n${tagId}\n` + text.substring(start);
              
              // Update Book Data
              const newCh = [...bookData.chapters];
              newCh[activeChapterIndex].content = newText;
              
              setBookData({
                  ...bookData,
                  chapters: newCh,
                  contentImages: {
                      ...bookData.contentImages,
                      [tagId]: b64
                  }
              });
          }
      };
      reader.readAsDataURL(file);
  };

  const updateChapterContent = (val: string) => {
    if (!bookData) return;
    const newCh = [...bookData.chapters];
    newCh[activeChapterIndex].content = val;
    setBookData({ ...bookData, chapters: newCh });
  };

  const updateChapterTitle = (val: string) => {
    if (!bookData) return;
    const newCh = [...bookData.chapters];
    newCh[activeChapterIndex].title = val;
    setBookData({ ...bookData, chapters: newCh });
  };

  const updateBookAuthor = (val: string) => {
      if (!bookData) return;
      setBookData({...bookData, authorName: val});
  };

  const updateBookFont = (val: 'helvetica' | 'times') => {
      if (!bookData) return;
      setBookData({...bookData, pdfFont: val});
  };

  const insertMarkdown = (type: 'bold' | 'h2' | 'list') => {
     const textarea = document.getElementById('chapter-editor') as HTMLTextAreaElement;
     if (!textarea || !bookData) return;
     
     const start = textarea.selectionStart;
     const end = textarea.selectionEnd;
     const text = bookData.chapters[activeChapterIndex].content;
     let newText = '';
     
     if (type === 'bold') newText = text.substring(0, start) + "**" + text.substring(start, end) + "**" + text.substring(end);
     if (type === 'h2') newText = text.substring(0, start) + "\n## " + text.substring(start, end) + "\n" + text.substring(end);
     if (type === 'list') newText = text.substring(0, start) + "\n- " + text.substring(start, end) + text.substring(end);
     
     updateChapterContent(newText);
  };

  const download = () => {
    if (bookData) generateBookPDF(bookData, 'save');
  };

  const downloadEpub = () => {
      if (bookData) generateBookEPUB(bookData);
  };

  const previewPdf = () => {
      if (bookData) {
          const url = generateBookPDF(bookData, 'blob');
          if (typeof url === 'string') {
              setPdfPreviewUrl(url);
              setShowPdfPreview(true);
          }
      }
  };

  const navigateToStep = (target: AppStep) => {
      if (step === 'editor') return; 
      setStep(target);
  };

  const formatDate = (ts: number) => {
      return new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  // --- RENDER ---

  return (
    <div className="min-h-screen bg-jasper-cream text-jasper-dark font-sans selection:bg-jasper-lime selection:text-black">
      
      {/* HEADER */}
      <header className="h-20 border-b border-gray-200 sticky top-0 z-40 px-6 md:px-12 flex items-center justify-between bg-jasper-cream/90 backdrop-blur-md">
         <div className="flex items-center gap-6">
             <div onClick={() => setView('library')} className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="bg-black text-white p-2 rounded-sm shadow-hard-sm">
                    <Book size={24} strokeWidth={2} />
                </div>
                <h1 className="font-serif text-2xl font-bold tracking-tight">BookGen <span className="text-gray-400 italic font-light">Studio</span></h1>
             </div>

            {view === 'wizard' && (
                <div className="hidden md:flex items-center gap-4 pl-6 border-l border-gray-300">
                    <button onClick={() => setView('library')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-black uppercase tracking-wide font-bold">
                        <ArrowLeft size={16} /> Library
                    </button>
                    {isSaving && (
                        <span className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                            <RefreshCw size={12} className="animate-spin" /> Auto-saving...
                        </span>
                    )}
                </div>
            )}
         </div>

         <div className="flex items-center gap-4">
             <button onClick={() => setShowConfig(true)} className="hidden md:flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:bg-white px-4 py-2 rounded-sm border border-transparent hover:border-gray-200 transition-all">
                <Settings size={18} />
                <span>Config</span>
             </button>
             {view === 'wizard' && step === 'editor' && (
                <>
                <button onClick={previewPdf} className="flex items-center gap-2 bg-white border border-gray-200 hover:border-black text-black px-5 py-2.5 rounded-sm text-sm font-bold uppercase tracking-wider shadow-sm transition-all">
                   <Eye size={18} />
                   <span className="hidden md:inline">Preview</span>
                </button>
                <div className="flex bg-black rounded-sm shadow-hard-sm">
                    <button onClick={download} className="flex items-center gap-2 bg-transparent text-white hover:bg-gray-800 px-4 py-2.5 text-sm font-bold uppercase tracking-wider transition-all border-r border-gray-700">
                       <Download size={18} />
                       <span className="hidden md:inline">PDF</span>
                    </button>
                    <button onClick={downloadEpub} className="flex items-center gap-2 bg-transparent text-white hover:bg-gray-800 px-4 py-2.5 text-sm font-bold uppercase tracking-wider transition-all">
                       <span className="hidden md:inline">EPUB</span>
                    </button>
                </div>
                </>
             )}
         </div>
      </header>

      {/* PDF PREVIEW MODAL */}
      {showPdfPreview && pdfPreviewUrl && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md flex items-center justify-center p-4 md:p-10">
              <div className="bg-jasper-cream w-full max-w-6xl h-full rounded-sm shadow-2xl flex flex-col border border-black">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                      <h2 className="font-serif text-xl font-bold flex items-center gap-2">PDF Live Preview</h2>
                      <button onClick={() => setShowPdfPreview(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
                  </div>
                  <div className="flex-1 bg-gray-200 p-4">
                      <iframe src={pdfPreviewUrl} className="w-full h-full shadow-lg" title="PDF Preview" />
                  </div>
              </div>
          </div>
      )}

      {/* CONFIG MODAL */}
      {showConfig && (
        <div className="fixed inset-0 z-[100] bg-jasper-cream/90 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white border border-black w-full max-w-lg shadow-hard p-8 space-y-6">
              <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl font-bold">Studio Configuration</h2>
                  <button onClick={() => setShowConfig(false)}><X size={24} /></button>
              </div>
              
              <div className="space-y-6">
                  <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">AI Provider</label>
                      <div className="grid grid-cols-3 gap-3">
                          {Object.values(AIProvider).map(p => (
                              <button 
                                key={p} 
                                onClick={() => handleProviderChange(p)}
                                className={`p-3 border text-xs font-bold uppercase tracking-wide transition-all
                                ${aiConfig.provider === p 
                                    ? 'bg-jasper-lime border-black text-black shadow-hard-sm' 
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}
                              >
                                {p.replace(' (NATIVE)', '')}
                              </button>
                          ))}
                      </div>
                  </div>

                  {aiConfig.provider !== AIProvider.GEMINI && (
                      <JasperInput 
                        label="API Key"
                        type="password"
                        value={aiConfig.apiKey}
                        onChange={(e: any) => setAiConfig({...aiConfig, apiKey: e.target.value})}
                        placeholder="sk-..."
                      />
                  )}

                  <JasperSelect label="Model" value={aiConfig.textModel} onChange={(e: any) => setAiConfig({...aiConfig, textModel: e.target.value})}>
                      {PROVIDER_MODELS[aiConfig.provider].map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                  </JasperSelect>
              </div>
              <div className="pt-4 flex justify-end">
                  <button onClick={() => setShowConfig(false)} className="bg-black text-white px-8 py-3 text-sm font-bold uppercase tracking-wider hover:bg-gray-800">
                      Save Changes
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* --- LIBRARY VIEW --- */}
      {view === 'library' && (
          <div className="max-w-7xl mx-auto p-6 md:p-12 animate-in fade-in duration-500">
              <div className="flex justify-between items-end mb-12">
                  <div>
                      <h2 className="text-5xl font-serif font-medium mb-4">Your Library</h2>
                      <p className="text-gray-500 font-sans text-lg">Manage your creations, edit drafts, or start something new.</p>
                  </div>
                  <button onClick={createNewBook} className="group flex items-center gap-2 text-black bg-jasper-lime px-6 py-4 text-sm font-bold uppercase tracking-wider shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                      <PenTool size={18} />
                      <span>Create New Book</span>
                  </button>
              </div>

              {library.length === 0 ? (
                  <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-sm">
                      <Library size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-400 font-serif text-xl">Your library is empty.</p>
                      <button onClick={createNewBook} className="mt-4 text-black underline font-bold uppercase text-sm tracking-wide">Start Writing</button>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {library.map(book => (
                          <div key={book.id} onClick={() => openBook(book)} className="bg-white border border-gray-200 group hover:shadow-hard transition-all cursor-pointer flex flex-col h-full">
                              <div className="aspect-[3/2] bg-gray-100 overflow-hidden relative border-b border-gray-100">
                                  {book.coverImageBase64 ? (
                                      <img src={`data:image/png;base64,${book.coverImageBase64}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                          <Book size={40} />
                                      </div>
                                  )}
                                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={(e) => cloneBook(e, book)} className="p-2 bg-white rounded-full hover:bg-black hover:text-white shadow-sm" title="Duplicate"><Copy size={14}/></button>
                                      <button onClick={(e) => deleteBook(e, book.id)} className="p-2 bg-white rounded-full hover:bg-red-500 hover:text-white shadow-sm" title="Delete"><Trash2 size={14}/></button>
                                  </div>
                              </div>
                              <div className="p-6 flex-1 flex flex-col">
                                  <h3 className="font-serif text-xl font-bold mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">{book.title || 'Untitled Book'}</h3>
                                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">{book.chapters.length} Chapters • {formatDate(book.updatedAt)}</p>
                                  <p className="text-gray-500 text-sm line-clamp-2 mb-6 flex-1">{book.context}</p>
                                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-black border-t border-gray-100 pt-4">
                                      <Edit3 size={12} /> Edit Draft
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* --- WIZARD VIEW --- */}
      {view === 'wizard' && (
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row min-h-[calc(100vh-80px)]">
              {/* SIDEBAR NAVIGATION */}
              {step !== 'editor' && (
                  <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-200 bg-jasper-cream/50 p-8 flex flex-col justify-between">
                      <div className="space-y-6">
                         <div className="pb-4 border-b border-gray-200">
                            <h3 className="font-serif text-xl italic text-gray-400">Workflow</h3>
                         </div>
                         <NavStep index={1} label="Concept" active={step === 'details'} done={step !== 'details'} onClick={() => navigateToStep('details')} />
                         <NavStep index={2} label="Texture" active={step === 'background'} done={['color', 'cover', 'generation'].includes(step)} onClick={() => navigateToStep('background')} />
                         <NavStep index={3} label="Palette" active={step === 'color'} done={['cover', 'generation'].includes(step)} onClick={() => navigateToStep('color')} />
                         <NavStep index={4} label="Cover Art" active={step === 'cover'} done={step === 'generation'} onClick={() => navigateToStep('cover')} />
                      </div>
                      
                      <div className="p-6 bg-white border border-gray-200 shadow-sm mt-8">
                          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                              <Cpu size={14} />
                              Engine Status
                          </div>
                          <div className="font-serif text-lg font-bold">
                              {aiConfig.provider.split(' ')[0]}
                          </div>
                          <div className="text-xs text-gray-500 truncate mt-1">
                              {aiConfig.textModel}
                          </div>
                      </div>
                  </aside>
              )}
    
              {/* MAIN CONTENT AREA */}
              <main className={`flex-1 p-6 md:p-12 overflow-y-auto ${step === 'editor' ? 'w-full max-w-full' : ''}`}>
                
                {/* STEP 1: FORM */}
                {step === 'details' && (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex items-end justify-between mb-12">
                        <div>
                            <h2 className="text-5xl font-serif font-medium mb-4">Start your masterpiece.</h2>
                            <p className="text-gray-500 font-sans text-lg max-w-lg">Define the core parameters. Our AI will handle the narrative structure and design language.</p>
                        </div>
                        <button onClick={randomizeBook} className="group flex items-center gap-2 text-black bg-jasper-lime px-5 py-3 text-sm font-bold uppercase tracking-wider shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                            <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                            <span>Inspire Me</span>
                        </button>
                    </div>
    
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 mb-8 font-medium">
                            <div className="flex items-center gap-2 mb-1 font-bold text-red-800"><X size={20} /> Error Occurred</div>
                            {error}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-8">
                            <JasperInput label="Book Title" value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="Enter a catchy title..." />
                            
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Synopsis & Tone</label>
                                <textarea 
                                    value={context} 
                                    onChange={e => setContext(e.target.value)} 
                                    className="w-full bg-white border border-gray-200 p-4 text-base focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-gray-300 min-h-[160px] font-sans resize-none" 
                                    placeholder="Describe the subject matter, the intended audience, and the desired writing style..." 
                                />
                            </div>
                        </div>
    
                        <div className="space-y-8 bg-white p-8 border border-gray-200 shadow-sm h-fit">
                            <JasperSelect label="Language" value={language} onChange={(e: any) => setLanguage(e.target.value as BookLanguage)}>
                                {Object.entries(BookLanguage).map(([k,v]) => <option key={k} value={v}>{v}</option>)}
                            </JasperSelect>
                            
                            <JasperSelect label="Book Length" value={length} onChange={(e: any) => setLength(e.target.value as BookLength)}>
                                {Object.values(BookLength).map(v => <option key={v} value={v}>{v}</option>)}
                            </JasperSelect>
    
                            <div className="pt-2 pb-2 border-t border-b border-gray-100 space-y-4">
                                 <JasperToggle 
                                    label="Text Only Mode" 
                                    checked={isTextOnly} 
                                    onChange={setIsTextOnly}
                                    helpText="Skip covers, backgrounds and images. Just pure content." 
                                 />
                                 
                                 {!isTextOnly && (
                                    <>
                                    <JasperSelect label="Illustration Frequency" value={imageFrequency} onChange={(e: any) => setImageFrequency(e.target.value as ImageFrequency)}>
                                        {Object.values(ImageFrequency).map(v => <option key={v} value={v}>{v}</option>)}
                                    </JasperSelect>
                                    
                                    <JasperToggle 
                                        label="Auto-Generate Illustrations" 
                                        checked={!isDeferredImages} 
                                        onChange={(val: boolean) => setIsDeferredImages(!val)}
                                        helpText="If off, you can generate images one by one in the editor later."
                                    />
                                    </>
                                 )}
                            </div>
    
                            <div className="pt-4">
                                {isTextOnly ? (
                                    <PrimaryButton 
                                        onClick={startTextOnlyMode} 
                                        disabled={!title || !context}
                                        loading={false}
                                        icon={PenTool}
                                    >
                                        Start Writing Now
                                    </PrimaryButton>
                                ) : (
                                    <PrimaryButton 
                                        onClick={() => generateBackgrounds(false)} 
                                        disabled={!title || !context}
                                        loading={status === 'generating_backgrounds'}
                                        icon={ArrowRight}
                                    >
                                        Generate Concepts
                                    </PrimaryButton>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                )}
    
                {/* STEP 2: BACKGROUND */}
                {step === 'background' && bookData?.backgroundOptions && (
                <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
                    <div className="flex justify-between items-end border-b border-gray-200 pb-6">
                        <div>
                            <h2 className="text-4xl font-serif font-medium mb-2">Paper Texture</h2>
                            <p className="text-gray-500">Choose the subtle background for your pages.</p>
                        </div>
                        <div className="flex gap-4">
                             <div className="relative">
                                <input 
                                    value={bgRefinement} 
                                    onChange={(e) => setBgRefinement(e.target.value)}
                                    placeholder="Refine (e.g. 'more geometric')" 
                                    className="bg-transparent border-b border-gray-300 focus:border-black px-2 py-2 w-64 outline-none text-sm"
                                />
                             </div>
                             <button onClick={() => generateBackgrounds(true)} className="p-3 bg-white border border-gray-200 hover:border-black transition-all">
                                {status === 'generating_backgrounds' ? <Loader2 size={20} className="animate-spin"/> : <RefreshCw size={20}/>}
                             </button>
                        </div>
                    </div>
    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <JasperCard onClick={skipBackground} className="cursor-pointer group flex flex-col items-center justify-center gap-4 min-h-[300px] border-dashed border-gray-300 hover:border-black">
                            <Layout size={40} className="text-gray-300 group-hover:text-black transition-colors" />
                            <span className="font-bold uppercase text-xs tracking-widest text-gray-400 group-hover:text-black">No Texture</span>
                        </JasperCard>
                        {bookData.backgroundOptions.map((bg, i) => (
                            <div key={i} onClick={() => selectBackground(bg)} className="group relative aspect-[1/1.4] cursor-pointer overflow-hidden border border-gray-200 hover:shadow-hard transition-all">
                                <img src={`data:image/png;base64,${bg}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-jasper-lime/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="font-serif text-2xl font-bold text-black">Select</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                )}
    
                {/* STEP 3: COLOR */}
                {step === 'color' && (
                <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-right-8">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl font-serif font-medium">Define your palette.</h2>
                        <p className="text-gray-500">This color will guide the visual hierarchy of the document.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {THEME_COLORS.map(c => (
                            <div key={c.hex} onClick={() => selectColor(c.hex)} className="cursor-pointer group relative">
                                <div className="w-full aspect-square mb-4 transition-transform group-hover:-translate-y-2 border border-gray-200 shadow-sm" style={{backgroundColor: c.hex}}></div>
                                <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                    <span className="font-serif text-lg">{c.name}</span>
                                    <div className={`w-3 h-3 rounded-full ${bookData?.themeColor === c.hex ? 'bg-black' : 'bg-transparent border border-gray-300'}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                )}
    
                {/* STEP 4: COVER */}
                {step === 'cover' && bookData?.coverOptions && (
                <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
                    <div className="flex justify-between items-end border-b border-gray-200 pb-6">
                        <div>
                            <h2 className="text-4xl font-serif font-medium mb-2">Cover Art</h2>
                            <p className="text-gray-500">The face of your new book.</p>
                        </div>
                        <div className="flex gap-4">
                             <div className="relative">
                                <input 
                                    value={coverRefinement} 
                                    onChange={(e) => setCoverRefinement(e.target.value)}
                                    placeholder="Refine (e.g. 'minimalist text')" 
                                    className="bg-transparent border-b border-gray-300 focus:border-black px-2 py-2 w-64 outline-none text-sm"
                                />
                             </div>
                             <button onClick={() => generateCovers(bookData, true)} className="p-3 bg-white border border-gray-200 hover:border-black transition-all">
                                {status === 'generating_covers' ? <Loader2 size={20} className="animate-spin"/> : <RefreshCw size={20}/>}
                             </button>
                        </div>
                    </div>
    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                         <JasperCard onClick={skipCover} className="cursor-pointer group flex flex-col items-center justify-center gap-4 min-h-[300px] border-dashed border-gray-300 hover:border-black">
                            <Layout size={40} className="text-gray-300 group-hover:text-black transition-colors" />
                            <span className="font-bold uppercase text-xs tracking-widest text-gray-400 group-hover:text-black">No Cover</span>
                        </JasperCard>
                        {bookData.coverOptions.map((cover, i) => (
                            <div key={i} onClick={() => selectCover(cover)} className="group relative aspect-[1/1.5] cursor-pointer overflow-hidden border border-gray-200 hover:shadow-hard transition-all">
                                <img src={`data:image/png;base64,${cover}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="bg-white text-black px-6 py-3 font-bold uppercase tracking-widest text-sm">Select Cover</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                )}
    
                {/* LOADING OVERLAY */}
                {['generating_backgrounds', 'generating_covers', 'planning', 'writing', 'generating_images'].includes(status) && (
                    <div className="fixed inset-0 bg-jasper-cream/90 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
                        <div className="w-full max-w-md text-center space-y-8">
                            <div className="relative mx-auto w-24 h-24">
                               <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                               <div className="absolute inset-0 border-4 border-jasper-lime rounded-full border-t-transparent animate-spin"></div>
                               <div className="absolute inset-0 flex items-center justify-center font-bold font-serif text-2xl">{progress}%</div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-3xl font-serif font-medium">Creating...</h3>
                                <p className="text-gray-500 uppercase tracking-widest text-xs font-bold animate-pulse">{progressLabel}</p>
                            </div>
                        </div>
                    </div>
                )}
    
                {/* EDITOR */}
                {step === 'editor' && bookData && (
                    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-140px)]">
                        {/* CHAPTER LIST & SETTINGS */}
                        <div className="w-full lg:w-80 flex flex-col gap-6">
                            
                            {/* Global Settings */}
                            <div className="bg-white border border-gray-200 p-4 shadow-sm">
                                <h3 className="font-serif text-lg mb-4 italic flex items-center gap-2">
                                    <Settings size={16} /> Book Settings
                                </h3>
                                <div className="space-y-4">
                                    <JasperInput 
                                        label="Author Name" 
                                        value={bookData.authorName || ''} 
                                        onChange={(e: any) => updateBookAuthor(e.target.value)}
                                        placeholder="e.g. John Doe"
                                    />
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">PDF Font</label>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => updateBookFont('helvetica')}
                                                className={`flex-1 py-2 text-xs font-bold uppercase border ${bookData.pdfFont === 'helvetica' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
                                            >
                                                Sans
                                            </button>
                                            <button 
                                                onClick={() => updateBookFont('times')}
                                                className={`flex-1 py-2 text-xs font-bold uppercase border ${bookData.pdfFont === 'times' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
                                            >
                                                Serif
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
    
                            {/* TOC */}
                            <div className="bg-white border border-black p-4 shadow-hard-sm flex-1 flex flex-col">
                                <h3 className="font-serif text-xl mb-4 italic">Table of Contents</h3>
                                <div className="overflow-y-auto max-h-[400px] space-y-2 pr-2 custom-scrollbar flex-1">
                                    {bookData.chapters.map((ch, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => setActiveChapterIndex(i)}
                                            className={`w-full text-left p-3 border transition-all
                                            ${activeChapterIndex === i 
                                                ? 'bg-jasper-lime border-black text-black font-bold shadow-sm' 
                                                : 'bg-white border-gray-100 hover:border-gray-300 text-gray-600'}`}
                                        >
                                            <div className="text-[10px] uppercase tracking-widest mb-1 opacity-60">Chapter {i+1}</div>
                                            <div className="line-clamp-1 font-serif">{ch.title}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
    
                        {/* MAIN EDITOR - PAPER STYLE */}
                        <div className="flex-1 bg-white border border-gray-200 shadow-sm flex flex-col relative">
                            {/* TOOLBAR */}
                            <div className="h-16 border-b border-gray-100 flex items-center px-6 justify-between bg-white gap-4">
                                <div className="flex items-center gap-2">
                                    <IconButton onClick={() => insertMarkdown('bold')}><Bold size={18} /></IconButton>
                                    <IconButton onClick={() => insertMarkdown('h2')}><Heading size={18} /></IconButton>
                                    <IconButton onClick={() => insertMarkdown('list')}><List size={18} /></IconButton>
                                    <div className="w-px h-6 bg-gray-200 mx-2"></div>
                                    <label className="cursor-pointer">
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                        <div className={`p-2 transition-colors rounded-sm text-gray-500 hover:bg-gray-100 hover:text-black`}>
                                            <Upload size={18} />
                                        </div>
                                    </label>
                                </div>
                                
                                {/* Editable Chapter Title */}
                                <div className="flex-1 max-w-lg flex items-center gap-2 border-b border-transparent focus-within:border-gray-300 transition-colors">
                                    <Pencil size={14} className="text-gray-300" />
                                    <input 
                                        className="w-full text-right font-serif italic text-gray-500 focus:text-black outline-none bg-transparent"
                                        value={bookData.chapters[activeChapterIndex].title}
                                        onChange={(e) => updateChapterTitle(e.target.value)}
                                    />
                                </div>
                            </div>
    
                            <div className="flex-1 flex overflow-hidden">
                                <textarea
                                    id="chapter-editor"
                                    value={bookData.chapters[activeChapterIndex].content}
                                    onChange={e => updateChapterContent(e.target.value)}
                                    className="flex-1 p-10 resize-none outline-none font-sans text-lg leading-relaxed text-gray-800 bg-white placeholder:text-gray-200 selection:bg-jasper-purple/30"
                                    spellCheck={false}
                                />
                                
                                {/* ASSETS PANEL */}
                                <div className="w-80 border-l border-gray-100 bg-gray-50 overflow-y-auto hidden xl:block p-6">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
                                        Visual Assets
                                    </div>
                                    <div className="space-y-6">
                                        {Object.entries(bookData.contentImages)
                                            .filter(([tag]) => bookData.chapters[activeChapterIndex].content.includes(tag))
                                            .map(([tag, img], i) => (
                                                <div key={i} className="bg-white p-2 shadow-sm border border-gray-100">
                                                    <div className="aspect-video bg-gray-100 mb-2 overflow-hidden relative flex items-center justify-center">
                                                        {img ? (
                                                            <img src={`data:image/png;base64,${img}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
                                                        ) : (
                                                            <div className="text-center p-4">
                                                                <div className="text-xs text-gray-400 mb-2 font-serif italic">Pending Art</div>
                                                                <button 
                                                                    onClick={() => generateSingleImage(tag)}
                                                                    disabled={pendingImageGen === tag}
                                                                    className="bg-black text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
                                                                >
                                                                    {pendingImageGen === tag ? <Loader2 size={12} className="animate-spin" /> : 'Generate Art'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-tight">
                                                        {tag.replace('[IMAGE_PROMPT:', '').replace(']', '')}
                                                    </p>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
              </main>
          </div>
      )}
    </div>
  );
};

export default App;
