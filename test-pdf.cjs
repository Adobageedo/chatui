// Simple test script to verify PDF extraction works
const fs = require('fs');
const path = require('path');

async function testPDFExtraction() {
  try {
    console.log('Testing PDF extraction...');
    
    // Try to load pdf-parse
    const pdf = require('pdf-parse');
    console.log('✓ pdf-parse loaded successfully');
    
    // Create a simple test buffer (minimal PDF structure)
    // This is a minimal valid PDF that contains just "Hello World"
    const testPDF = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Hello World) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
409
%%EOF`);
    
    console.log('Testing PDF parsing...');
    const data = await pdf(testPDF);
    
    console.log('✓ PDF parsed successfully');
    console.log('Extracted text:', data.text);
    console.log('Number of pages:', data.numpages);
    
    console.log('\n✅ PDF extraction is working!');
    
  } catch (error) {
    console.error('❌ PDF extraction failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testPDFExtraction();
