
import { BookData, BookLanguage } from "../types";

const getJSZip = () => {
    const jszip = (window as any).JSZip;
    if (!jszip) throw new Error("JSZip library not loaded");
    return new jszip();
};

const escapeHtml = (unsafe: string) => {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

const markdownToHtml = (markdown: string, images: Record<string, string | null>) => {
    let html = markdown
        // Subtitles
        .replace(/^##\s*(.*$)/gim, '<h2>$1</h2>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Lists
        .replace(/^\-\s*(.*$)/gim, '<ul><li>$1</li></ul>')
        // Fix consecutive lists
        .replace(/<\/ul>\s*<ul>/g, '')
        // Paragraphs (lines that don't start with <)
        .replace(/^(?!<)(.*$)/gim, '<p>$1</p>');

    // Images
    Object.keys(images).forEach(tag => {
        const b64 = images[tag];
        if (b64 && html.includes(tag)) {
            // We use a simpler tag for EPUB that references the file structure
            // The logic below will handle extracting the b64 to a file
            const imgId = tag.replace(/\W/g, ''); 
            html = html.replace(tag, `<div class="img-container"><img src="images/${imgId}.png" alt="Illustration" /></div>`);
        } else if (html.includes(tag)) {
            html = html.replace(tag, ''); // Remove pending tags
        }
    });

    return html;
};

export const generateBookEPUB = async (book: BookData) => {
    const zip = getJSZip();
    const cleanTitle = book.title.replace(/\s+/g, '_');
    
    // 1. Mimetype
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    // 2. META-INF
    const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
   <rootfiles>
      <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
   </rootfiles>
</container>`;
    zip.folder("META-INF").file("container.xml", containerXml);

    // 3. OEBPS Folder
    const oebps = zip.folder("OEBPS");
    const imagesFolder = oebps.folder("images");

    // Assets Processing
    let manifestItems = '';
    let spineRefs = '';
    let navPoints = '';
    let imageCounter = 0;

    // Cover
    if (book.coverImageBase64) {
        imagesFolder.file("cover.png", book.coverImageBase64, {base64: true});
        manifestItems += `<item id="cover-img" href="images/cover.png" media-type="image/png" properties="cover-image"/>\n`;
        // Cover Page HTML
        const coverHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Cover</title><style>img { max-width: 100%; }</style></head>
<body><img src="images/cover.png" alt="Cover" /></body></html>`;
        oebps.file("cover.xhtml", coverHtml);
        manifestItems += `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>\n`;
        spineRefs += `<itemref idref="cover"/>\n`;
    }

    // Process Chapters
    book.chapters.forEach((chapter, index) => {
        const chId = `chapter_${index + 1}`;
        const chFile = `${chId}.xhtml`;
        
        // Extract Images for this chapter
        // We need to loop through book.contentImages and save them if they appear in this chapter
        Object.keys(book.contentImages).forEach(tag => {
            if (chapter.content.includes(tag) && book.contentImages[tag]) {
                const imgId = tag.replace(/\W/g, '');
                imagesFolder.file(`${imgId}.png`, book.contentImages[tag], {base64: true});
                // Check if already added to manifest to avoid dupes
                if (!manifestItems.includes(`id="${imgId}"`)) {
                    manifestItems += `<item id="${imgId}" href="images/${imgId}.png" media-type="image/png"/>\n`;
                }
            }
        });

        const contentHtml = markdownToHtml(chapter.content, book.contentImages);
        const chapterDoc = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeHtml(chapter.title)}</title>
  <style>
    body { font-family: serif; line-height: 1.6; padding: 1em; }
    h1 { color: ${book.themeColor}; text-align: center; margin-bottom: 1em; }
    h2 { color: ${book.themeColor}; margin-top: 1.5em; border-bottom: 1px solid #eee; }
    p { margin-bottom: 1em; text-align: justify; }
    img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
    .img-container { text-align: center; }
  </style>
</head>
<body>
  <h1>${escapeHtml(chapter.title)}</h1>
  ${contentHtml}
</body>
</html>`;

        oebps.file(chFile, chapterDoc);
        manifestItems += `<item id="${chId}" href="${chFile}" media-type="application/xhtml+xml"/>\n`;
        spineRefs += `<itemref idref="${chId}"/>\n`;
        navPoints += `<navPoint id="navPoint-${index + 1}" playOrder="${index + 1}"><navLabel><text>${escapeHtml(chapter.title)}</text></navLabel><content src="${chFile}"/></navPoint>\n`;
    });

    // Content OPF
    const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>${escapeHtml(book.title)}</dc:title>
        <dc:language>${book.language === BookLanguage.PT ? 'pt' : 'en'}</dc:language>
        <dc:creator>BookGen AI</dc:creator>
        <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
    </metadata>
    <manifest>
        <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        ${manifestItems}
    </manifest>
    <spine toc="toc">
        ${spineRefs}
    </spine>
</package>`;

    oebps.file("content.opf", opf);

    // TOC NCX (Legacy but good for compatibility)
    const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head><meta name="dtb:uid" content="urn:uuid:12345"/></head>
    <docTitle><text>${escapeHtml(book.title)}</text></docTitle>
    <navMap>
        ${navPoints}
    </navMap>
</ncx>`;

    oebps.file("toc.ncx", ncx);

    // Generate
    const content = await zip.generateAsync({ type: "blob" });
    
    // Save
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = `${cleanTitle}.epub`;
    a.click();
};
