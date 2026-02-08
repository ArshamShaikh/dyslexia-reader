# OCR Platform Notes (Google Vision)

This document summarizes OCR behavior, costs, limits, and practical usage mapping for this project.

## 1) Current Status
- `Image OCR`: Implemented via backend (`/ocr`) using Google Vision.
- `File import`: `.txt`, `.docx`, `.pdf` support added.
- `PDF (text-based)`: Extracted via server-side text extraction.
- `Scanned PDF OCR fallback`: Planned (Vision async batch for image-based PDFs).

## 2) Why Scanned PDF OCR Fallback Exists
- Many PDFs are scanned images, not selectable text.
- Normal PDF extraction returns empty/poor output for those files.
- Scanned PDF OCR fallback runs OCR page-by-page on scanned PDFs and returns readable text to the custom reader UI.

## 3) Google Vision OCR Pricing (INR planning values)

Vision bills per image/page unit.
- First `1,000` units per month: `Free`
- Units `1,001` to `5,000,000`: `INR 135 / 1,000 units` (about `INR 0.135` per page)
- Units `5,000,001+`: `INR 54 / 1,000 units` (about `INR 0.054` per page)

For files like PDF/TIFF, each page is a separate billable unit.

## 4) Practical Usage Mapping (Real-Life)

Assumptions:
- 25 active reading days/month
- 1 scanned page = 1 Vision billable unit

### A) Individual usage
- 5 scanned pages/day -> 125 pages/month -> Free (within first 1,000)
- 10 scanned pages/day -> 250 pages/month -> Free
- 30 scanned pages/day -> 750 pages/month -> Free

### B) Small class pilot
- 30 students x 10 pages/day x 25 days = 7,500 pages/month
- Billable after free tier: 6,500 pages
- Estimated cost: `6.5 x INR 135 ~= INR 878/month`

### C) Medium deployment
- 100 students x 15 pages/day x 25 days = 37,500 pages/month
- Billable after free tier: 36,500 pages
- Estimated cost: `36.5 x INR 135 ~= INR 4,928/month`

### D) Larger rollout
- 500 students x 15 pages/day x 25 days = 187,500 pages/month
- Billable after free tier: 186,500 pages
- Estimated cost: `186.5 x INR 135 ~= INR 25,178/month`

### E) Scanned PDF-specific example
- 200 uploads/month, average 40 pages each = 8,000 OCR pages/month
- Billable after free tier: 7,000 pages
- Estimated cost: `7.0 x INR 135 ~= INR 945/month`

## 5) Usage Limits and Quotas (Important)

From Vision docs:
- Requests/minute: `1,800`
- Text detection feature quota/minute: `1,800`
- Async document text detection pages in processing: `10,000`
- PDF size limit: `1 GB`
- `files:annotate` page limit: `5 pages`
- `files:asyncBatchAnnotate` page limit: `2,000 pages/file`

For PDF/TIFF async OCR:
- Input must be in Cloud Storage
- Output JSON is written to Cloud Storage
- Service account auth is required (API key is not supported for request submission)

## 6) Cost and Reliability Guardrails (Recommended)

To keep OCR cost low and UX stable:
1. Use direct PDF text extraction first; trigger OCR only if extraction is empty/poor.
2. Add page cap (for example, OCR max 80 to 120 pages by default).
3. Allow user-selected page ranges for OCR.
4. Cache OCR result by file hash (avoid repeat billing for same file).
5. Queue large OCR jobs asynchronously with clear status updates.
6. Add monthly usage counters and alerts in backend logs.

## 7) Recommended Product Policy

For dyslexia-first UX:
- Keep custom reader mode as primary (fonts, spacing, colors, highlight).
- Use OCR as ingestion pipeline, not as final viewing format.
- Keep native PDF layout optional, not core.

## 8) References
- Vision pricing: https://cloud.google.com/vision/pricing
- Vision quotas/limits: https://docs.cloud.google.com/vision/quotas
- Batch file OCR (PDF/TIFF): https://cloud.google.com/vision/docs/file-batch
- Detect text in files: https://cloud.google.com/vision/docs/pdf
