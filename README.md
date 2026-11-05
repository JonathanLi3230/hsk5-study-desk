# HSK 5 Study Desk

A browser app for learning the **1,547 words that are new at HSK 3.0 Level 5** (the exam syllabus released by CTI/CLEC in November 2025) and using them in real conversation. It's built for intermediate learners who already know Levels 1–4.

## What's in it

- **Flashcards with spaced repetition.** Rate each card Again, Difficult, Good or Easy. There's a daily review queue, an adjustable number of new words per day, and bookmarks for hard words.
- **Every word card has:**
  - pinyin with tone marks, hidden until you tap it or press P (a setting can always show it)
  - a natural English meaning
  - three example sentences or short dialogues, each with pinyin, a translation and normal or slow audio
  - a register label: formal, neutral, informal or mainly written
  - common word combinations
  - usage notes, including Taiwan usage where it differs
- **Listening.** Word and sentence or dialogue comprehension, plus dictation in characters or pinyin. Transcripts stay hidden until you answer.
- **Quizzes.** Meaning, English to Chinese, sentence completion, and picking the right word in context, with an explanation of why each wrong option doesn't fit.
- **Writing practice.** Six exercise types:
  - translation
  - reordering words into a sentence
  - combining sentences with connectors
  - using a word combination in your own sentence
  - fill in the blank
  - short writing prompts

  Hints fade as you improve. Writing has its own review schedule, and your answers are saved so you can look back and retry.
- **Handwriting.** Stroke-order animation and practice grids (trace twice, then write from memory). It doesn't grade your handwriting.
- **Conversation.** Polite refusals, indirect requests, implied meaning and idioms, labelled as beyond the HSK list.
- **Progress.** Counts of new, learning, due and mastered words, a 7-day review forecast, 30-day activity, mastery by topic, and backup and restore.

## Running it

The app is a static site. To use it locally, serve the folder and open `index.html`:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

It also works on GitHub Pages: in the repository settings, set Pages to deploy from the `main` branch root.

### Inside Claude vs. standalone

`artifact.html` is the version published as a Claude artifact. Opened inside Claude, the page can:
- save progress to your Claude account (`db` and `user` capabilities)
- give AI feedback on open-ended writing (`sample` capability)

`index.html` is the standalone version. Outside Claude:
- progress is saved in the browser's `localStorage`, so use **Progress › Backup** to move it between devices
- writing falls back to self-check against a suggested answer, clearly labelled
- reordering and fill-in-the-blank answers are checked by exact match, which is also labelled

Audio uses the browser's built-in speech synthesis with a Mandarin (zh-CN) voice. If no Mandarin voice is installed, the app explains how to add one.

## Project layout

| Path | What it is |
|---|---|
| `content/b00.txt` – `b11.txt` | The authored word cards, one line per word: `word\|pinyin\|meaning\|register\|topic\|example\|translation\|combinations\|note` |
| `content/s00.txt` – `s11.txt` | Two more example sentences for every word: `word\|sentence\|translation\|sentence\|translation` |
| `content/extras_pragmatics.txt` | Conversational expressions (beyond the list) |
| `content/extras_writing.txt` | Sentence-combining exercises and writing prompts |
| `build.js` | Merges the content with the source word list and generates sentence pinyin, producing `data.js` |
| `strokes.js` | Bundles stroke-order data for the list's characters into `strokes/` |
| `app.css`, `app1.js`–`app5.js` | The app: storage and scheduling, views, listening and quizzes, writing and handwriting, progress and settings |
| `assemble.js` | Inlines the CSS and JS into `index.html` and `artifact.html` |

### Rebuilding

```sh
git clone https://github.com/drkameleon/complete-hsk-vocabulary ../complete-hsk-vocabulary
npm install
npm run build    # HSK_SRC=/path/to/complete-hsk-vocabulary to override the source location
```

## Sources and credits

- **Word list:** [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT), using its "newest" HSK 3.0 lists, which follow the 2025 syllabus. The part-of-speech and frequency data also come from there. Learning difficulty (Core, Common, Less common) is the dataset's frequency rank split into thirds.
- **Dictionary glosses** for the Level 1–4 reference list come from [CC-CEDICT](https://cc-cedict.org/) (CC BY-SA 4.0), via the dataset above.
- **Stroke order:** [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data), under the Arphic Public License (see `strokes/ARPHICPL.TXT`). It is based on Make Me a Hanzi. Animations use [Hanzi Writer](https://hanziwriter.org/).
- **Sentence pinyin:** generated with [pinyin-pro](https://github.com/zh-lx/pinyin-pro) at build time, using the authored word pinyin wherever a Level 5 word appears. Text that only exists at runtime (your answers, AI feedback) gets pinyin in the browser from the same library. Word pinyin is authored. Sentence pinyin is automatic and may occasionally misread a character with more than one pronunciation.
- The English meanings, the three example sentences or dialogues per word, register labels, topics, combinations, usage notes, conversational expressions and writing exercises were written for this project.
