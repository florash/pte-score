# PTE Practice App

A lightweight PTE Academic practice app for speaking, writing, reading, and listening.

## Features

- Speaking practice:
  - Read Aloud
  - Repeat Sentence
  - Describe Image
  - Re-tell Lecture
  - Answer Short Question
- Writing practice:
  - Summarize Written Text
  - Write Essay
- Reading practice:
  - Reading & Writing Fill in the Blanks
  - Multiple Choice, Single Answer
  - Multiple Choice, Multiple Answers
  - Re-order Paragraphs
  - Reading Fill in the Blanks
- Listening practice:
  - Summarize Spoken Text
  - Multiple Choice tasks
  - Fill in the Blanks
  - Highlight Correct Summary
  - Select Missing Word
  - Highlight Incorrect Words
  - Write From Dictation

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- Browser Speech Recognition API
- Browser MediaRecorder API

## Local Run

From the project folder:

```bash
./serve.sh
```

Or:

```bash
python3 server.py
```

Then open:

```text
http://localhost:3000
```

## Notes

- Chrome is recommended for microphone and speech recognition features.
- On first use, allow microphone access for `localhost:3000`.
- Speaking tasks work best after microphone permission has been granted once.

## Project Structure

```text
.
├── app.js
├── index.html
├── styles.css
├── data/
│   └── questions.js
├── js/
│   ├── utils.js
│   ├── scorer.js
│   ├── ai-scorer.js
│   └── pages/
├── serve.sh
└── server.py
```

## Status

This is a personal practice project and is designed for study and training use.
