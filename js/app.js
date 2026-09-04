const { createApp } = Vue;

// localStorage keys for the "keep the last text" stretch feature.
const STORAGE_KEYS = {
  sourceText: 'codeMetricsLab.sourceText',
  activeTool: 'codeMetricsLab.activeTool'
};

// The tools a restored activeTool value is allowed to be, so corrupt or
// stale storage can never leave the app on an unknown tool.
const VALID_TOOLS = ['counter', 'case', 'duplicates', 'password', 'json'];

// WHY: storage can be disabled (private mode), blocked, or full. Every access
// is wrapped so a failure only skips persistence — the app keeps working from
// memory and the in-memory data is never lost because a save/read failed.
function safeStorageRead(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Code Metrics Lab: localStorage read skipped.', error);
    return null;
  }
}

function safeStorageWrite(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Code Metrics Lab: localStorage write skipped.', error);
  }
}

function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Code Metrics Lab: localStorage remove skipped.', error);
  }
}

createApp({
  data() {
    // Restore from storage on load; fall back to defaults if nothing is
    // saved or storage is unavailable.
    const savedText = safeStorageRead(STORAGE_KEYS.sourceText);
    const savedTool = safeStorageRead(STORAGE_KEYS.activeTool);
    return {
      // The single source of truth: everything derives from this in memory.
      // localStorage only mirrors it; memory always wins.
      sourceText: savedText !== null ? savedText : '',
      activeTool: VALID_TOOLS.includes(savedTool) ? savedTool : 'counter',
      // Holds the pending debounced-save timer id (not used for rendering).
      saveTimer: null
    };
  },
  watch: {
    // Debounce the text save by ~300ms so we don't write on every keystroke.
    // An empty box removes the key instead of storing an empty string.
    sourceText(value) {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        if (value === '') {
          safeStorageRemove(STORAGE_KEYS.sourceText);
        } else {
          safeStorageWrite(STORAGE_KEYS.sourceText, value);
        }
      }, 300);
    },
    // The active tool changes rarely, so persist it immediately.
    activeTool(value) {
      safeStorageWrite(STORAGE_KEYS.activeTool, value);
    }
  },
  computed: {
    // WHY: several tools share this "is there anything to analyse?" test,
    // and the empty-state messages depend on it.
    hasText() {
      return this.sourceText.trim().length > 0;
    },

    // WHY: the counter empty state must reflect a literally empty box, so
    // whitespace-only input still reports its real character/line counts.
    isEmpty() {
      return this.sourceText.length === 0;
    },

    // --- Counter (feature 1) ---

    // A word is any run of non-whitespace characters.
    wordCount() {
      const matches = this.sourceText.match(/\S+/g);
      return matches ? matches.length : 0;
    },

    charCount() {
      return this.sourceText.length;
    },

    // Lines are split by newline; empty text counts as 0 lines, not 1.
    lineCount() {
      return this.sourceText === '' ? 0 : this.sourceText.split(/\r?\n/).length;
    },

    // A paragraph is a block of text separated by one or more blank lines.
    paragraphCount() {
      return this.sourceText
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        .filter((block) => block.length > 0).length;
    },

    // Estimated reading time at 200 words per minute; under one minute the
    // rubric requires the literal string "< 1 min".
    readingTime() {
      const minutes = this.wordCount / 200;
      return minutes < 1 ? '< 1 min' : `${Math.round(minutes)} min`;
    },

    // --- Case converter (feature 3) ---
    // Each result is derived from sourceText and never mutates it.

    upperResult() {
      return this.sourceText.toUpperCase();
    },

    lowerResult() {
      return this.sourceText.toLowerCase();
    },

    // Capitalize the first letter of every word; lowercase the rest so the
    // output is a clean, consistent Title Case regardless of input casing.
    titleResult() {
      return this.sourceText
        .split(/(\s+)/) // keep the separators so original spacing survives
        .map((chunk) =>
          /\s/.test(chunk)
            ? chunk
            : chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase()
        )
        .join('');
    },

    // Convert each line independently so the result keeps the same number
    // of lines as the input (matching UPPERCASE/lowercase/Title Case).
    snakeResult() {
      return this.sourceText
        .split(/\r?\n/)
        .map((line) => this.toWords(line).join('_'))
        .join('\n');
    },

    camelResult() {
      return this.sourceText
        .split(/\r?\n/)
        .map((line) =>
          this.toWords(line)
            .map((word, index) =>
              index === 0
                ? word
                : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join('')
        )
        .join('\n');
    },

    // --- Password strength meter (feature 5) ---

    // The whole (trimmed) source text is treated as the candidate password.
    passwordCandidate() {
      return this.sourceText.trim();
    },

    // One row per criterion, each with its own explanation and pass/fail flag.
    passwordCriteria() {
      const pwd = this.passwordCandidate;
      return [
        { label: 'At least 8 characters', passed: pwd.length >= 8 },
        { label: 'Contains an uppercase letter', passed: /[A-Z]/.test(pwd) },
        { label: 'Contains a lowercase letter', passed: /[a-z]/.test(pwd) },
        { label: 'Contains a digit', passed: /\d/.test(pwd) },
        { label: 'Contains a symbol', passed: /[^A-Za-z0-9\s]/.test(pwd) }
      ];
    },

    passwordScore() {
      return this.passwordCriteria.filter((c) => c.passed).length;
    },

    // 0–2 = Weak, 3–4 = Medium, 5 = Strong. The class drives the colour of
    // both the label and the progress bar.
    passwordStrength() {
      const score = this.passwordScore;
      if (score <= 2) return { label: 'Weak', className: 'weak' };
      if (score <= 4) return { label: 'Medium', className: 'medium' };
      return { label: 'Strong', className: 'strong' };
    },

    // --- Duplicate line finder (feature 4) ---
    // Returns [{ line, count }] for lines that appear more than once,
    // in the order of their first appearance. Blank lines are ignored and
    // leading/trailing whitespace is not significant.
    duplicateLines() {
      const counts = new Map();
      const order = [];

      this.sourceText.split(/\r?\n/).forEach((rawLine) => {
        const line = rawLine.trim();
        if (line === '') return; // ignore fully blank lines
        if (!counts.has(line)) order.push(line);
        counts.set(line, (counts.get(line) || 0) + 1);
      });

      return order
        .filter((line) => counts.get(line) > 1)
        .map((line) => ({ line, count: counts.get(line) }));
    },

    // --- JSON formatter & validator (feature 6) ---
    // WHY: parsing is wrapped in try/catch so no input can ever crash the app.
    // Returns a discriminated result: 'empty' | 'valid' | 'invalid'.
    jsonResult() {
      const text = this.sourceText.trim();
      if (text === '') {
        return { state: 'empty' };
      }
      try {
        const parsed = JSON.parse(text);
        return { state: 'valid', output: JSON.stringify(parsed, null, 2) };
      } catch (error) {
        return { state: 'invalid', error: error.message };
      }
    }
  },
  methods: {
    // Empty the editor and drop the saved value. Cancelling the pending
    // debounced save prevents a stray write from re-storing the old text.
    clearText() {
      clearTimeout(this.saveTimer);
      this.sourceText = '';
      safeStorageRemove(STORAGE_KEYS.sourceText);
    },

    // WHY: snake_case and camelCase share the exact same tokenisation —
    // trim, split on any run of non-alphanumeric characters (whitespace or
    // punctuation), drop empties, and lowercase each piece.
    toWords(text) {
      return text
        .trim()
        .split(/[^a-zA-Z0-9]+/)
        .filter((piece) => piece.length > 0)
        .map((piece) => piece.toLowerCase());
    }
  }
}).mount('#app');
