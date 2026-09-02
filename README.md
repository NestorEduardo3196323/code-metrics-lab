<!--
  Code Metrics Lab — Text & Code Analyser
  Team: Nestor Deodanes · Samuel Mendoza · Marcela Mata · Daniela Rodriguez
  Purpose: Project overview, requirements, and run instructions.
-->

# Code Metrics Lab — Text & Code Analyser

A single-page text and code analyser built with Vue 3 in CDN mode. It counts
words, characters, lines and paragraphs, estimates reading time, converts case,
finds duplicate lines, rates password strength, and formats and validates JSON —
all updating live as you type. **No database: all data lives in memory in the
browser.** Nothing is sent to a server and nothing is persisted, so refreshing
the page starts with a clean slate.

## Requirements

- Any modern browser (Chrome, Firefox, Edge, or Safari).
- VS Code with the Live Server extension (recommended for local use).

## How to run

1. Open the project folder in VS Code.
2. Right-click `index.html` in the Explorer.
3. Choose **Open with Live Server**.

The app loads Vue 3 from a CDN and falls back to a local copy in `/assets`, so
it also works offline.

## Evidence

Screenshots of the running application live in the [`Evidence/`](Evidence) folder:

- [Project running](Evidence/EV-01-project-running.png)
- [Live counters](Evidence/EV-02-live-counters.png)
- [Case converter](Evidence/EV-03-case-converter.png)
- [Duplicate lines](Evidence/EV-04-duplicate-lines.png)

## Author

Nestor Deodanes · Samuel Mendoza · Marcela Mata · Daniela Rodriguez

INDEL, BTV Software Development, Module 3.6
