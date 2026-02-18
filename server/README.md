# Server (OCR + PDF)

This folder contains a minimal Node/Express server that exposes:
- `POST /ocr` for image OCR
- `POST /pdf` for PDF text extraction with scanned-PDF OCR fallback
- `POST /docx` for DOCX extraction
- `GET /jobs/:jobId` for async scanned-PDF OCR polling
- `POST /events/client-error` for client crash/error telemetry

## Setup
1. Create a Google Cloud project
2. Enable **Vision API**
3. Create a **Service Account** and download the JSON key
4. Copy `.env.example` to `.env` and set:
   - `GOOGLE_APPLICATION_CREDENTIALS` to the full path of your JSON key
   - Optional scaling knobs:
     - `MAX_UPLOAD_MB` (default `100`)
     - `MAX_EXTRACTED_TEXT_CHARS` (default `2000000`)
   - Optional API protection:
     - `API_ACCESS_TOKEN` (if set, clients must send Bearer token)
     - `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS`
5. Optional for scanned PDF fallback: configure Cloud Storage buckets
   - `GOOGLE_VISION_PDF_INPUT_BUCKET`
   - `GOOGLE_VISION_PDF_OUTPUT_BUCKET`

## Run
```bash
cd server
npm install
npm run dev
```

Extraction QA before release:
```bash
npm run test:extraction
npm run test:extraction:strict
```

## Notes
- `/pdf` first tries `pdf-parse` for text-layer PDFs.
- If no text is detected and buckets are configured, it queues OCR and returns `202` + `jobId` (poll `/jobs/:jobId`).
- Use `GET /health` to verify fallback readiness (`scannedPdfOcrFallback`).
- Server now normalizes extracted text for all routes (`/ocr`, `/pdf`, `/docx`) before returning it.
- Gzip compression is enabled for response payloads.
