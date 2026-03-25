import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = '';

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const parser = new PDFParse({ 
        data: buffer,
        cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/standard_fonts/"
      });
      const data = await parser.getText();
      extractedText = data.text;
      await parser.destroy();
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      file.name.toLowerCase().endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a .pdf or .docx file.' }, { status: 400 });
    }

    // Clean up page numbers from the extracted text
    const cleanedText = extractedText
      .split('\n')
      .filter(line => {
        const t = line.trim();
        if (!t) return true; // Keep empty lines for structural parsing
        if (/^[\d\s\-\.\/]+$/.test(t)) return false; // "128", "- 128 -", "128.", "128--129"
        if (/^page\s*\d+$/i.test(t)) return false;   // "Page 128"
        return true;
      })
      .join('\n');

    return NextResponse.json({ text: cleanedText });
  } catch (error: any) {
    console.error('Document Parsing Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to parse document' }, { status: 500 });
  }
}
