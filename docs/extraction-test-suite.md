# Extraction Test Suite (TXT/PDF/DOCX)

This test suite checks whether imported text is readable and properly structured after extraction + cleaning.

It is focused on student-friendly output:
- headings should remain visible
- numbering and bullets should stay intact
- wrapped lines should not break into messy one-word lines

## Run

From repo root:

```bash
npm run test:extraction
```

From `server/`:

```bash
npm run test:extraction
```

The report is written to:

- `server/tests/last-extraction-report.md`

## Default Corpus

Default input folder:

- `server/test-corpus`

It currently includes structured `.txt` fixtures with:
- numbering
- bullets
- headings
- wrapped paragraphs
- letter-style formatting

## Add Real Files (Recommended)

To test with real student documents, add files into:

- `server/test-corpus/pdf/*.pdf`
- `server/test-corpus/docx/*.docx`
- `server/test-corpus/txt/*.txt`

The runner scans folders recursively, so any subfolder structure is fine.

## Assertions Per File (Optional but Useful)

For strict validation, add an expectation file next to each input file:

- `your-file.pdf.expect.json`
- `your-file.docx.expect.json`
- `your-file.txt.expect.json`

Supported keys:

```json
{
  "minChars": 250,
  "minNumberedLines": 3,
  "minBulletLines": 2,
  "minTableRows": 4,
  "maxSingleWordLineRatio": 0.15,
  "requiredContains": ["software engineering", "umbrella activities"],
  "requiredRegex": ["^1\\.\\s+Explain", "^Subject:\\s+"],
  "warnIfMissing": ["conclusion"]
}
```

## Pass/Fail Logic

The suite fails when:
- extracted+cleaned text is empty
- expectation rules are violated
- parser throws an error

It warns when:
- output is unusually short
- line-wrapping quality looks suspicious
- optional tokens are missing

## Why This Helps

This catches the common student-facing issues early:
- broken numbering in question banks
- paragraph line breaks becoming unreadable
- list structure loss after extraction
- parser regressions after code changes
