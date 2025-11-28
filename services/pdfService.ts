
import { BookData, BookLanguage } from "../types";

const getJsPDF = () => {
  const jspdf = (window as any).jspdf;
  if (!jspdf) throw new Error("jsPDF library not loaded");
  return jspdf;
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
};

const getTranslations = (lang: BookLanguage) => {
  switch (lang) {
    case BookLanguage.EN: return { index: "SUMMARY", chapter: "Chapter", by: "Written by" };
    case BookLanguage.ES: return { index: "ÍNDICE", chapter: "Capítulo", by: "Escrito por" };
    case BookLanguage.FR: return { index: "SOMMAIRE", chapter: "Chapitre", by: "Écrit par" };
    case BookLanguage.DE: return { index: "ZUSAMMENFASSUNG", chapter: "Kapitel", by: "Geschrieben von" };
    default: return { index: "SUMÁRIO", chapter: "Capítulo", by: "Escrito por" };
  }
};

// --- CONSTANTS ---
const MARGIN_X = 20;
const MARGIN_Y = 20;

// --- UTILS ---

/**
 * Draws the specific "Annex" style header and footer
 */
const drawLayout = (doc: any, title: string, pageNum: number, width: number, height: number, color: any, fontName: string) => {
  // Header: Line + Title + Dot
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, 15, width - MARGIN_X, 15);
  
  doc.setFont(fontName, "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(title, width - MARGIN_X - 5, 12, { align: 'right' });
  
  // Theme Dot
  doc.setFillColor(color.r, color.g, color.b);
  doc.circle(width - MARGIN_X, 12, 1.5, 'F');

  // Footer: Colored Bottom Bar with Page Num
  doc.setFillColor(color.r, color.g, color.b);
  doc.rect(0, height - 15, width, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont(fontName, "bold");
  doc.setFontSize(11);
  doc.text(`${pageNum}`, width / 2, height - 5, { align: 'center' });
};

// --- TEXT ENGINE ---

/**
 * Parses markdown string into styled tokens
 */
interface Token { text: string; isBold: boolean; }

const parseTokens = (text: string): Token[] => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return { text: part.slice(2, -2), isBold: true };
    }
    return { text: part, isBold: false };
  }).filter(t => t.text.length > 0);
};

export const generateBookPDF = (book: BookData, action: 'save' | 'blob' = 'save'): string | void => {
  const { jsPDF } = getJsPDF();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (MARGIN_X * 2);
  const themeRgb = hexToRgb(book.themeColor);
  const labels = getTranslations(book.language);
  const mainFont = book.pdfFont || 'helvetica';
  const author = book.authorName || "BookGen AI";

  // Background Helper - FULL PAGE BLEED
  const applyBackground = () => {
    if (book.backgroundImageBase64) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.15 }));
      try { 
          // 0, 0, pageWidth, pageHeight ensures full coverage
          doc.addImage(`data:image/png;base64,${book.backgroundImageBase64}`, 'PNG', 0, 0, pageWidth, pageHeight); 
      } catch(e){}
      doc.restoreGraphicsState();
    }
  };

  // --- 1. COVER (Only if exists) ---
  if (book.coverImageBase64) {
    try { 
        doc.addImage(`data:image/png;base64,${book.coverImageBase64}`, 'PNG', 0, 0, pageWidth, pageHeight); 
        doc.addPage(); // Add page after cover
    } 
    catch(e) { 
        // If fail, just skip cover
    }
  }

  // --- 2. TITLE PAGE ---
  // If no cover, this is page 1. If cover exists, this is page 2.
  applyBackground();
  
  // Decorative Theme Bar
  doc.setFillColor(themeRgb.r, themeRgb.g, themeRgb.b);
  doc.rect(0, 0, pageWidth, 15, 'F'); // Top bar

  doc.setTextColor(themeRgb.r, themeRgb.g, themeRgb.b);
  doc.setFont(mainFont, "bold");
  doc.setFontSize(36);
  doc.text(doc.splitTextToSize(book.title, contentWidth), pageWidth/2, 100, {align:'center'});
  
  doc.setFontSize(14);
  doc.setTextColor(100,100,100);
  doc.text(`${labels.by} ${author}`, pageWidth/2, pageHeight - 40, {align:'center'});

  // --- 3. RESERVE INDEX PAGE ---
  doc.addPage(); 
  const indexPageIndex = doc.internal.getNumberOfPages();
  
  // --- 4. CHAPTERS CONTENT ---
  // If cover(1) + title(2) + index(3), content starts at 4.
  // If no cover, title(1) + index(2), content starts at 3.
  const startPageOffset = book.coverImageBase64 ? 4 : 3;
  let globalPage = startPageOffset; 
  
  const chapterPageMapping: { title: string, page: number }[] = [];

  book.chapters.forEach((chapter, chIdx) => {
    doc.addPage();
    const currentPdfPage = doc.internal.getNumberOfPages();
    
    chapterPageMapping.push({ title: chapter.title, page: currentPdfPage });

    applyBackground();
    drawLayout(doc, `${labels.chapter} ${chIdx+1}`, globalPage, pageWidth, pageHeight, themeRgb, mainFont);

    let cursorY = MARGIN_Y + 15;
    
    // Chapter Title Styling
    doc.setFont(mainFont, "bold");
    doc.setFontSize(60);
    doc.setTextColor(240, 240, 240); // Subtle background number
    doc.text(`${chIdx+1}`, pageWidth - MARGIN_X, cursorY + 10, {align: 'right'});
    
    doc.setFontSize(32);
    doc.setTextColor(themeRgb.r, themeRgb.g, themeRgb.b);
    const titleLines = doc.splitTextToSize(chapter.title, contentWidth - 30);
    doc.text(titleLines, MARGIN_X, cursorY + 10);
    
    cursorY += (titleLines.length * 12) + 25;

    // Content Parsing
    const rawLines = chapter.content.split('\n');

    for (let i=0; i<rawLines.length; i++) {
        let line = rawLines[i].trim();
        if(!line) { cursorY += 6; continue; }

        // Filter Title Repetition
        if (i < 5) {
            const normalizedLine = line.toLowerCase().replace(/[#*]/g, '').trim();
            const normalizedTitle = chapter.title.toLowerCase().trim();
            if (normalizedLine === normalizedTitle || normalizedLine === normalizedTitle + '.') {
                continue;
            }
        }

        // Page Break Check
        if (cursorY > pageHeight - MARGIN_Y - 20) {
            doc.addPage();
            globalPage++;
            applyBackground();
            drawLayout(doc, `${labels.chapter} ${chIdx+1}`, globalPage, pageWidth, pageHeight, themeRgb, mainFont);
            cursorY = MARGIN_Y + 15;
        }

        // --- SUBTITLES (##) ---
        if (line.startsWith('##')) {
            const subText = line.replace(/^##\s*/, '').replace(/\*\*/g, '').trim();
            
            // STRICT FONT SETTING FOR SUBTITLES
            doc.setFontSize(18);
            doc.setFont(mainFont, "bold");
            doc.setTextColor(255, 255, 255);
            
            const subLines = doc.splitTextToSize(subText, contentWidth - 10);
            const boxHeight = (subLines.length * 8) + 6;

            if (cursorY + boxHeight > pageHeight - MARGIN_Y) {
               doc.addPage();
               globalPage++;
               applyBackground();
               drawLayout(doc, `${labels.chapter} ${chIdx+1}`, globalPage, pageWidth, pageHeight, themeRgb, mainFont);
               cursorY = MARGIN_Y + 15;
            }

            doc.setFillColor(themeRgb.r, themeRgb.g, themeRgb.b);
            doc.roundedRect(MARGIN_X, cursorY, contentWidth, boxHeight, 1, 1, 'F');
            
            // Re-apply font settings just to be safe
            doc.setFontSize(18);
            doc.setFont(mainFont, "bold");
            doc.setTextColor(255,255,255);
            doc.text(subLines, MARGIN_X + 5, cursorY + 8);
            
            cursorY += boxHeight + 10;
            
            // RESET TO BODY FONT IMMEDIATELY
            doc.setTextColor(0,0,0);
            doc.setFontSize(14);
            doc.setFont(mainFont, "normal");
            continue;
        }

        // --- IMAGES ---
        const imgMatch = line.match(/\[IMAGE_PROMPT:\s*(.*?)\]/i);
        if (imgMatch) {
            const b64 = book.contentImages[line]; // Uses full tag as key
            if (b64) {
                const stdHeight = contentWidth / 1.5; // 3:2 Ratio

                if (cursorY + stdHeight > pageHeight - MARGIN_Y) {
                    doc.addPage();
                    globalPage++;
                    applyBackground();
                    drawLayout(doc, `${labels.chapter} ${chIdx+1}`, globalPage, pageWidth, pageHeight, themeRgb, mainFont);
                    cursorY = MARGIN_Y + 15;
                }

                try {
                   doc.addImage(`data:image/png;base64,${b64}`, 'PNG', MARGIN_X, cursorY, contentWidth, stdHeight);
                } catch (e) {}

                cursorY += stdHeight + 8;
            }
            continue;
        }

        // --- PARAGRAPHS & LISTS ---
        doc.setTextColor(0, 0, 0); 
        const tokens = parseTokens(line);
        
        // FORCE BODY FONT SETTINGS
        doc.setFontSize(14); 
        
        let lineBuffer: {text:string, width:number, isBold:boolean}[] = [];
        let curLineWidth = 0;
        
        const words: {text:string, isBold:boolean, width:number}[] = [];
        tokens.forEach(t => {
           doc.setFont(mainFont, t.isBold ? "bold" : "normal");
           const wList = t.text.split(' ');
           wList.forEach((w, idx) => {
               const txt = w + (idx < wList.length -1 ? ' ' : '');
               words.push({ text: txt, isBold: t.isBold, width: doc.getTextWidth(txt) });
           });
        });

        for (let j=0; j<words.length; j++) {
            const word = words[j];
            
            if (curLineWidth + word.width > contentWidth) {
                let printX = MARGIN_X;
                const extraSpace = contentWidth - curLineWidth;
                const gap = (lineBuffer.length > 1 && j < words.length - 2) ? extraSpace / (lineBuffer.length - 1) : 0;

                lineBuffer.forEach(lb => {
                    doc.setFont(mainFont, lb.isBold ? "bold" : "normal");
                    doc.text(lb.text.trim(), printX, cursorY);
                    printX += lb.width + gap; 
                });

                cursorY += 7; 
                lineBuffer = [];
                curLineWidth = 0;

                if (cursorY > pageHeight - MARGIN_Y - 20) {
                     doc.addPage();
                     globalPage++;
                     applyBackground();
                     drawLayout(doc, `${labels.chapter} ${chIdx+1}`, globalPage, pageWidth, pageHeight, themeRgb, mainFont);
                     cursorY = MARGIN_Y + 15;
                     
                     doc.setTextColor(0,0,0);
                     doc.setFontSize(14);
                     doc.setFont(mainFont, word.isBold ? "bold" : "normal");
                }
            }

            lineBuffer.push(word);
            curLineWidth += word.width;
        }

        if (lineBuffer.length > 0) {
             let printX = MARGIN_X;
             lineBuffer.forEach(lb => {
                doc.setFont(mainFont, lb.isBold ? "bold" : "normal");
                doc.text(lb.text.trim(), printX, cursorY);
                printX += lb.width; 
             });
             cursorY += 10; 
        }
    }
    
    if (chIdx < book.chapters.length - 1) {
       globalPage++;
    }
  });

  // --- 5. FILL INDEX PAGE (New Modern Design) ---
  doc.setPage(indexPageIndex);
  // White clean background for index
  doc.setFillColor(255,255,255);
  doc.rect(0,0, pageWidth, pageHeight, 'F');

  // Blue Side Block
  doc.setFillColor(themeRgb.r, themeRgb.g, themeRgb.b);
  doc.rect(0, 0, 8, 80, 'F'); // Top left accent
  doc.rect(0, 0, pageWidth, 15, 'F'); // Top bar

  doc.setFont(mainFont, "bold");
  doc.setFontSize(48);
  doc.setTextColor(0,0,0);
  doc.text(labels.index, MARGIN_X, 50);

  doc.setDrawColor(200,200,200);
  doc.line(MARGIN_X, 60, pageWidth - MARGIN_X, 60);

  let idxY = 80;

  chapterPageMapping.forEach((item, i) => {
      // Check page overflow for index
      if (idxY > pageHeight - 30) {
          doc.addPage(); // Insert new page for index overflow if extremely long
          doc.setPage(doc.internal.getNumberOfPages()); 
          idxY = 30;
      }

      const numStr = (i + 1).toString().padStart(2, '0');
      
      // Number
      doc.setFont(mainFont, "bold");
      doc.setFontSize(18);
      doc.setTextColor(themeRgb.r, themeRgb.g, themeRgb.b);
      doc.text(numStr, MARGIN_X, idxY);

      // Title
      doc.setFontSize(14);
      doc.setTextColor(0,0,0);
      doc.text(item.title, MARGIN_X + 15, idxY);
      
      // Page Num
      const pageStr = String(item.page - (book.coverImageBase64 ? 0 : 0)); // Visual mapping
      doc.setTextColor(150,150,150);
      doc.text(pageStr, pageWidth - MARGIN_X, idxY, { align: 'right' });

      // Link
      doc.link(MARGIN_X, idxY - 5, contentWidth, 10, { pageNumber: item.page });

      idxY += 12; // Gap between chapters (removed subtitles gap)
  });

  if (action === 'save') {
      doc.save(`${book.title.replace(/\s+/g, '_')}.pdf`);
  } else {
      return doc.output('bloburl');
  }
};
