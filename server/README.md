# Server (OCR + PDF)

This folder contains a minimal Node/Express server that exposes:
- `POST /ocr` for image OCR
- `POST /pdf` for PDF text extraction (placeholder until async batch is wired)

## Setup
1. Create a Google Cloud project
2. Enable **Vision API**
3. Create a **Service Account** and download the JSON key
4. Copy `.env.example` to `.env` and set:
   - `GOOGLE_APPLICATION_CREDENTIALS` to the full path of your JSON key

## Run
```bash
cd server
npm install
npm run dev
```

## Notes
- This uses simple sync `textDetection` as a placeholder for PDFs.
- For reliable PDFs (multi‑page), we should switch to the async batch API with Cloud Storage.
