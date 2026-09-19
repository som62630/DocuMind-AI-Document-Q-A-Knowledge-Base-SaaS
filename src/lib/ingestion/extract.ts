import mammoth from 'mammoth'

// Use require for pdf-parse to handle CJS default export compatibility
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse')

export interface ExtractedPage {
  pageNumber: number
  text: string
}

export interface ExtractionResult {
  fullText: string
  pages: ExtractedPage[]
  isScannedPdf?: boolean
  errorReason?: string
}

/**
 * Extracts raw text and page breakdown from uploaded document buffers.
 */
export async function extractTextFromBuffer(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ExtractionResult> {
  const normalizedMime = mimeType.toLowerCase()

  // 1. PDF Documents
  if (normalizedMime === 'application/pdf' || fileName.endsWith('.pdf')) {
    try {
      const pageTexts: ExtractedPage[] = []

      // Custom page renderer to capture page numbers and text per page
      const options = {
        pagerender: function (pageData: {
          pageIndex: number
          getTextContent: () => Promise<{ items: Array<{ str: string; transform: number[] }> }>
        }) {
          return pageData.getTextContent().then(function (textContent) {
            let lastY: number | undefined
            let text = ''
            for (const item of textContent.items) {
              if (lastY === item.transform[5] || !lastY) {
                text += item.str
              } else {
                text += '\n' + item.str
              }
              lastY = item.transform[5]
            }
            pageTexts.push({
              pageNumber: pageData.pageIndex + 1,
              text: text.trim(),
            })
            return text
          })
        },
      }

      const pdfData = await pdfParse(fileBuffer, options)
      const fullText = (pdfData.text || '').trim()
      const totalPages = pdfData.numpages || 1

      // Scanned PDF detection heuristic
      const avgCharsPerPage = fullText.length / Math.max(1, totalPages)
      if (fullText.length < 30 || avgCharsPerPage < 15) {
        return {
          fullText: '',
          pages: [],
          isScannedPdf: true,
          errorReason: 'Scanned or image-only PDF detected. OCR is required to read this document.',
        }
      }

      return {
        fullText,
        pages: pageTexts.length > 0 ? pageTexts : [{ pageNumber: 1, text: fullText }],
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Corrupted file format'
      return {
        fullText: '',
        pages: [],
        errorReason: `Failed to parse PDF document: ${msg}`,
      }
    }
  }

  // 2. Microsoft Word Documents (.docx)
  if (
    normalizedMime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer })
      const text = result.value.trim()

      if (!text) {
        return {
          fullText: '',
          pages: [],
          errorReason: 'Document appears to be empty or contains no extractable text.',
        }
      }

      return {
        fullText: text,
        pages: [{ pageNumber: 1, text }],
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unsupported format'
      return {
        fullText: '',
        pages: [],
        errorReason: `Failed to parse DOCX document: ${msg}`,
      }
    }
  }

  // 3. Plain Text Documents (.txt)
  if (normalizedMime === 'text/plain' || fileName.endsWith('.txt')) {
    try {
      const text = fileBuffer.toString('utf-8').trim()
      if (!text) {
        return {
          fullText: '',
          pages: [],
          errorReason: 'Plain text file is empty.',
        }
      }
      return {
        fullText: text,
        pages: [{ pageNumber: 1, text }],
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Read error'
      return {
        fullText: '',
        pages: [],
        errorReason: `Failed to read plain text file: ${msg}`,
      }
    }
  }

  return {
    fullText: '',
    pages: [],
    errorReason: `Unsupported file type: ${mimeType || fileName}`,
  }
}
