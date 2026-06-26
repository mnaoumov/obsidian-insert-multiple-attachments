# CLAUDE.md

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
| Commit (wizard)   | `npm run commit`           |

## Architecture

- **Root config files** are thin re-exports — actual logic lives in `scripts/` (`eslint.config.mts` → `scripts/eslint-config.ts`, etc.).
- **`src/`** — plugin source:
  - `main.ts` — Obsidian entry point; imports the SCSS and default-exports the `Plugin` class.
  - `plugin.ts` — `Plugin extends PluginBase`; `onloadImpl` wires up the settings component, settings tab, menu-event registrar, and the `CommandHandlerComponent` holding the `InvokeCommandHandler`.
  - `plugin-settings.ts` — `PluginSettings` data class: `attachmentLinksPrefix`, `attachmentLinksDelimiter` (default `\n\n`), `attachmentLinksSuffix`.
  - `plugin-settings-component.ts` — `PluginSettingsComponent extends PluginSettingsComponentBase`; registers a legacy-settings converter mapping the old `shouldInsertDoubleLinesBetweenAttachmentLinks` flag to a delimiter.
  - `plugin-settings-tab.ts` — `PluginSettingsTab extends PluginSettingsTabBase`; renders prefix/delimiter/suffix text settings with whitespace visualized as `␣`/`↵` via value converters.
  - `insert-attachments-control.ts` — `InsertAttachmentsControl`: creates a hidden multi-file `<input>`, saves each chosen file via `app.saveAttachment`, builds embed markdown links, and inserts them into the editor joined by the configured prefix/delimiter/suffix.
  - `command-handlers/invoke-command-handler.ts` — `InvokeCommandHandler extends EditorCommandHandler` (id `invoke`, icon `lucide-paperclip`); `executeEditor` instantiates `InsertAttachmentsControl`.
  - `styles/main.scss` — plugin styles; `styles/scss.d.ts` — SCSS module type declaration.
- **`main` field** points to `src/main.ts` (Obsidian plugin source entry; built artifact is `dist/build/main.js`, not published to npm).

## Known Issues

None.
