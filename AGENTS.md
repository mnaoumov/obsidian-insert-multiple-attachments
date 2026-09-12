# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Insert Multiple Attachments is an Obsidian plugin that allows inserting multiple attachments at a time, extending the built-in `Insert Attachment` command to support selecting several files at once. It is built on `obsidian-dev-utils`.

## Commands

| Task              | Command                    |
|-------------------|----------------------------|
| TypeScript check  | `npm run build:compile`    |
| Build             | `npm run build`            |
| Dev (watch)       | `npm run dev`              |
| Lint              | `npm run lint`             |
| Lint (fix)        | `npm run lint:fix`         |
| Format            | `npm run format`           |
| Format (check)    | `npm run format:check`     |
| Spellcheck        | `npm run spellcheck`       |
| Markdown lint     | `npm run lint:md`          |
| Markdown lint fix | `npm run lint:md:fix`      |
| Unit tests        | `npm test`                 |
| Coverage          | `npm run test:coverage`    |
| Integration tests | `npm run test:integration` |
| Branch gate       | `npm run gate`             |
| Commit (wizard)   | `npm run commit`           |

## Architecture

- **Root config files** are thin re-exports — actual logic lives in `scripts/` (`eslint.config.mts` → `scripts/eslint-config.ts`, etc.).
- **`src/`** — plugin source:
  - `main.ts` — Obsidian entry point; imports the SCSS and default-exports the `Plugin` class.
  - `plugin.ts` — `Plugin extends PluginBase`; `onloadImpl` wires up the settings component and settings tab, then registers the `InvokeCommandHandler` via the base-provided `this.commandHandlerComponent` (the active-file provider, command registrar, and menu-event registrar are owned by `PluginBase` since obsidian-dev-utils 86.0.0).
  - `plugin-settings.ts` — `PluginSettings` data class: `attachmentLinksPrefix`, `attachmentLinksDelimiter` (default `\n\n`), `attachmentLinksSuffix`.
  - `plugin-settings-component.ts` — `PluginSettingsComponent extends PluginSettingsComponentBase`; registers a legacy-settings converter mapping the old `shouldInsertDoubleLinesBetweenAttachmentLinks` flag to a delimiter.
  - `plugin-settings-tab.ts` — `PluginSettingsTab extends PluginSettingsTabBase`; renders prefix/delimiter/suffix text settings with whitespace visualized as `␣`/`↵` via value converters.
  - `insert-attachments-control.ts` — `InsertAttachmentsControl`: creates a hidden multi-file `<input>`, saves each chosen file via `app.saveAttachment`, builds embed markdown links, and inserts them into the editor joined by the configured prefix/delimiter/suffix.
  - `command-handlers/invoke-command-handler.ts` — `InvokeCommandHandler extends EditorCommandHandler` (id `invoke`, icon `lucide-paperclip`); `executeEditor` instantiates `InsertAttachmentsControl`.
  - `styles/main.scss` — plugin styles; `styles/scss.d.ts` — SCSS module type declaration.
- **`main` field** points to `src/main.ts` (Obsidian plugin source entry; built artifact is `dist/build/main.js`, not published to npm).

## Testing notes

### The mobile screenshot capture suite

`npm run capture:screenshots` writes the two community-store mobile frames. The two frames are captured
by **different routes on purpose**, and the difference is load-bearing:

- **Frame 1 — the saved attachments — captures the PAGE** (`captureObsidianScreenshot`), which is
  byte-reproducible: no status bar and no clock, so re-capturing it produces identical bytes and an
  unchanged frame leaves no diff.
- **Frame 2 — the command palette — captures the DEVICE** (`captureDeviceScreenshot`), with the soft
  keyboard raised first. A page capture cannot show a keyboard: it drives Appium in the WebView context,
  so it photographs the page, and the IME is a system window that is not part of the page. That left this
  frame as a search field floating over an empty band across three quarters of the image — honest about
  the DOM and misleading about the phone. **The cost is that frame 2 is no longer byte-reproducible**,
  because the status-bar clock and the battery indicator are in it. Do not "fix" that churn by putting it
  back on the page capture, and do not switch frame 1 over for consistency — a shot with no focused field
  gets no keyboard on a real phone either, so raising one there would make the frame less true.
- **Raising the keyboard takes TWO things**, which is why both belong to `obsidian-integration-testing`
  rather than being copied in here. The AVD is built with a hardware keyboard attached, so Android
  suppresses the on-screen one entirely — `withSoftKeyboardEnabled` lifts that for the duration of the
  shot and restores the device exactly, including restoring a setting that had never been written, which
  takes a delete rather than a write. And a WebView will not ask for an IME on programmatic focus alone:
  `raiseSoftKeyboard` lands a real touch on the field and then proves geometrically that it lifted,
  because nothing in the page reports the keyboard — `innerHeight`, `visualViewport` and the modal
  container all keep their full height with it shown.
- **The field it touches is read off the suite, not assumed.** The command palette renders
  `.prompt input`, which is not the `.prompt-input` a suggester renders.
