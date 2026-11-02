// ================= DOCUMENT PARSER & PAGE COUNTER =================

/**
 * Formats byte size into precise, human-readable file size string (KB, MB, GB).
 */
export function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 KB';
    if (bytes < 1024) return bytes + ' Bytes';
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + ' KB';
    }
    if (bytes < 10 * 1024 * 1024) {
        // e.g. 4.62 MB for sub-10MB files
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    if (bytes < 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

/**
 * Accurately extracts the number of pages or slides from an uploaded File/Blob object.
 * Supports PDF, DOCX, PPTX, and TXT.
 */
export async function detectDocumentPages(file) {
    if (!file) return 1;

    const ext = (file.name ? file.name.split('.').pop() : '').toLowerCase();

    try {
        if (ext === 'pdf') {
            const pages = await detectPdfPages(file);
            if (pages > 0) return pages;
        } else if (ext === 'docx') {
            const pages = await detectDocxPages(file);
            if (pages > 0) return pages;
        } else if (ext === 'pptx') {
            const slides = await detectPptxPages(file);
            if (slides > 0) return slides;
        } else if (ext === 'doc') {
            const pages = await estimateDocPages(file);
            if (pages > 0) return pages;
        } else if (['txt', 'md', 'csv'].includes(ext)) {
            const pages = await detectTextPages(file);
            if (pages > 0) return pages;
        }
    } catch (err) {
        console.warn('Page detection error for ' + file.name + ':', err);
    }

    // Default fallback based on file size if parsing fails: ~1 page per 55KB
    const estimated = Math.max(1, Math.round((file.size || 55000) / (55 * 1024)));
    return Math.min(estimated, 250);
}

/**
 * Extracts page count from PDF by reading the page tree catalog or /Count tags.
 */
async function detectPdfPages(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder('latin1').decode(bytes);

    // 1. Match PDF dictionary containing both /Type /Pages and /Count \d+ (in either order)
    const pageDictRegex = /<<(?=[^>]*?\/Type\s*\/Pages)(?=[^>]*?\/Count\s+(\d+))[^>]*?>>/gis;
    const dictMatches = [...text.matchAll(pageDictRegex)];
    if (dictMatches.length > 0) {
        const counts = dictMatches.map(m => parseInt(m[1], 10)).filter(n => !isNaN(n) && n > 0);
        if (counts.length > 0) return Math.max(...counts);
    }

    // 2. Direct sequence /Type /Pages ... /Count \d+
    const directMatches = [...text.matchAll(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/gi)];
    if (directMatches.length > 0) {
        const counts = directMatches.map(m => parseInt(m[1], 10)).filter(n => !isNaN(n) && n > 0);
        if (counts.length > 0) return Math.max(...counts);
    }

    // 3. Fallback: count individual /Type /Page (excluding /Pages)
    const pageMatches = text.match(/\/Type\s*\/Page\b/gi);
    if (pageMatches && pageMatches.length > 0) {
        return pageMatches.length;
    }

    // 4. Match general /Count \d+ if under 5000
    const generalCounts = [...text.matchAll(/\/Count\s+(\d+)/gi)];
    if (generalCounts.length > 0) {
        const counts = generalCounts.map(m => parseInt(m[1], 10)).filter(n => !isNaN(n) && n > 0 && n < 5000);
        if (counts.length > 0) return Math.max(...counts);
    }

    return Math.max(1, Math.round(file.size / (65 * 1024)));
}

/**
 * Extracts page count from DOCX (OpenXML ZIP archive) by inspecting docProps/app.xml or counting paragraphs.
 */
async function detectDocxPages(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. Try uncompressed/raw scan for <Pages>(\d+)</Pages> in docProps/app.xml
    const latinText = new TextDecoder('latin1').decode(bytes);
    const pagesMatch = latinText.match(/<Pages>(\d+)<\/Pages>/i);
    if (pagesMatch && parseInt(pagesMatch[1], 10) > 0) {
        return parseInt(pagesMatch[1], 10);
    }

    // 2. Try parsing ZIP entries to locate docProps/app.xml
    try {
        const entries = parseZipEntries(buffer);
        const appXmlEntry = entries['docProps/app.xml'] || entries['docprops/app.xml'];
        if (appXmlEntry) {
            const rawData = bytes.subarray(appXmlEntry.dataOffset, appXmlEntry.dataOffset + appXmlEntry.compSize);
            let xmlText = '';
            if (appXmlEntry.compMethod === 0) {
                // Stored (no compression)
                xmlText = new TextDecoder().decode(rawData);
            } else if (appXmlEntry.compMethod === 8 && typeof DecompressionStream !== 'undefined') {
                xmlText = await decompressDeflate(rawData);
            }

            if (xmlText) {
                const match = xmlText.match(/<Pages>(\d+)<\/Pages>/i);
                if (match && parseInt(match[1], 10) > 0) {
                    return parseInt(match[1], 10);
                }
                const wordsMatch = xmlText.match(/<Words>(\d+)<\/Words>/i);
                if (wordsMatch && parseInt(wordsMatch[1], 10) > 0) {
                    return Math.max(1, Math.round(parseInt(wordsMatch[1], 10) / 300));
                }
                const paraMatch = xmlText.match(/<Paragraphs>(\d+)<\/Paragraphs>/i);
                if (paraMatch && parseInt(paraMatch[1], 10) > 0) {
                    return Math.max(1, Math.round(parseInt(paraMatch[1], 10) / 18));
                }
            }
        }

        // Secondary check: word/document.xml for rendered page breaks or paragraphs
        const docXmlEntry = entries['word/document.xml'];
        if (docXmlEntry && docXmlEntry.compMethod === 8 && typeof DecompressionStream !== 'undefined') {
            const rawData = bytes.subarray(docXmlEntry.dataOffset, docXmlEntry.dataOffset + docXmlEntry.compSize);
            const docXml = await decompressDeflate(rawData);
            if (docXml) {
                const pageBreaks = (docXml.match(/w:lastRenderedPageBreak|w:type="page"/g) || []).length;
                if (pageBreaks > 0) return pageBreaks + 1;
                const paragraphs = (docXml.match(/<w:p\b/g) || []).length;
                if (paragraphs > 0) return Math.max(1, Math.round(paragraphs / 18));
            }
        }
    } catch (zipErr) {
        console.warn('Docx zip parsing fallback:', zipErr);
    }

    // Word count estimate fallback from raw binary
    const wordsRaw = latinText.match(/<Words>(\d+)<\/Words>/i);
    if (wordsRaw && parseInt(wordsRaw[1], 10) > 0) {
        return Math.max(1, Math.round(parseInt(wordsRaw[1], 10) / 300));
    }

    return Math.max(1, Math.round(file.size / (45 * 1024)));
}

/**
 * Extracts slide count from PPTX by counting ppt/slides/slideN.xml in the ZIP directory.
 */
async function detectPptxPages(file) {
    const buffer = await file.arrayBuffer();

    try {
        const entries = parseZipEntries(buffer);
        const slideFiles = Object.keys(entries).filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name));
        if (slideFiles.length > 0) {
            return slideFiles.length;
        }

        // Check docProps/app.xml for <Slides>N</Slides>
        const appXmlEntry = entries['docProps/app.xml'] || entries['docprops/app.xml'];
        if (appXmlEntry && typeof DecompressionStream !== 'undefined') {
            const bytes = new Uint8Array(buffer);
            const rawData = bytes.subarray(appXmlEntry.dataOffset, appXmlEntry.dataOffset + appXmlEntry.compSize);
            const xmlText = await decompressDeflate(rawData);
            const match = xmlText.match(/<Slides>(\d+)<\/Slides>/i);
            if (match && parseInt(match[1], 10) > 0) {
                return parseInt(match[1], 10);
            }
        }

        const latinText = new TextDecoder('latin1').decode(new Uint8Array(buffer));
        const slidesMatch = latinText.match(/<Slides>(\d+)<\/Slides>/i);
        if (slidesMatch && parseInt(slidesMatch[1], 10) > 0) {
            return parseInt(slidesMatch[1], 10);
        }
    } catch (e) {
        console.warn('PPTX slide detection error:', e);
    }

    return 1;
}

/**
 * Estimates pages for legacy binary .doc files
 */
async function estimateDocPages(file) {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder('latin1').decode(new Uint8Array(buffer));
    const match = text.match(/\x02\x00\x00\x00Page[^\d]*(\d+)/i);
    if (match && parseInt(match[1], 10) > 0) return parseInt(match[1], 10);
    return Math.max(1, Math.round(file.size / (40 * 1024)));
}

/**
 * Counts pages for plain text files
 */
async function detectTextPages(file) {
    const text = await file.text();
    const lines = text.split('\n').length;
    return Math.max(1, Math.ceil(lines / 45));
}

/**
 * Helper to decompress deflate-raw bytes using browser DecompressionStream
 */
async function decompressDeflate(compressedBytes) {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(compressedBytes);
    writer.close();

    const reader = ds.readable.getReader();
    const chunks = [];
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
    }
    return new TextDecoder().decode(merged);
}

/**
 * Zero-dependency ZIP directory parser for Office OpenXML documents
 */
function parseZipEntries(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const entries = {};

    let eocdOffset = -1;
    for (let i = bytes.length - 22; i >= 0; i--) {
        if (view.getUint32(i, true) === 0x06054b50) {
            eocdOffset = i;
            break;
        }
    }

    if (eocdOffset === -1) {
        let pos = 0;
        while (pos < bytes.length - 30) {
            if (view.getUint32(pos, true) === 0x04034b50) {
                const compMethod = view.getUint16(pos + 8, true);
                const compSize = view.getUint32(pos + 18, true);
                const uncompSize = view.getUint32(pos + 22, true);
                const nameLen = view.getUint16(pos + 26, true);
                const extraLen = view.getUint16(pos + 28, true);
                const name = new TextDecoder().decode(bytes.subarray(pos + 30, pos + 30 + nameLen));
                const dataOffset = pos + 30 + nameLen + extraLen;
                entries[name] = { compMethod, compSize, uncompSize, dataOffset };
                pos = dataOffset + compSize;
            } else {
                pos++;
            }
        }
        return entries;
    }

    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const cdSize = view.getUint32(eocdOffset + 12, true);
    let pos = cdOffset;

    while (pos < cdOffset + cdSize && pos < bytes.length - 46) {
        if (view.getUint32(pos, true) !== 0x02014b50) break;
        const compMethod = view.getUint16(pos + 10, true);
        const compSize = view.getUint32(pos + 20, true);
        const uncompSize = view.getUint32(pos + 24, true);
        const nameLen = view.getUint16(pos + 28, true);
        const extraLen = view.getUint16(pos + 30, true);
        const commentLen = view.getUint16(pos + 32, true);
        const localHeaderOffset = view.getUint32(pos + 42, true);

        const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
        const localNameLen = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;

        entries[name] = { compMethod, compSize, uncompSize, dataOffset };
        pos += 46 + nameLen + extraLen + commentLen;
    }

    return entries;
}
