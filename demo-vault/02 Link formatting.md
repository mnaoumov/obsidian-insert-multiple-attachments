# Link formatting

When the plugin inserts several attachments, it wraps the whole block and joins the individual embeds using three configurable pieces of text:

- **Prefix**
  - inserted once, before the first embed.
- **Delimiter**
  - inserted between each pair of embeds.
- **Suffix**
  - inserted once, after the last embed.

So for two attachments the inserted text is:

```text
<prefix><embed 1><delimiter><embed 2><suffix>
```

## Defaults

Out of the box the prefix and suffix are **empty** and the delimiter is a **blank line** (two newlines), so each attachment lands on its own paragraph:

```markdown
![[first.png]]

![[second.png]]
```

## Change it

1. Open **Settings -> Community plugins -> Insert Multiple Attachments**.
2. Edit **Attachment links prefix**, **Attachment links delimiter**, and/or **Attachment links suffix**. Spaces show as `␣` and newlines as `↵` so whitespace-only values stay visible; press `Enter` inside a field to add a newline.
3. Re-run the command in [Playground](<./Playground.md>) and watch how the embeds are joined.

Each field maps to a setting key documented in [03 Settings](<./03 Settings.md>).

## Three arrangements to try

Whitespace-only values are awkward to type into a settings field and easy to get wrong, so each of these sets all three fields at once. Press one, then re-run the insert in the playground:

```code-button
---
caption: Side by side (delimiter is a single space)
---
await require('/demoSetup.ts').changeSettings(app, { attachmentLinksDelimiter: ' ', attachmentLinksPrefix: '', attachmentLinksSuffix: '' });
```

Manual equivalent: set **Attachment links delimiter** to a single space (shown as `␣`), and clear the prefix and suffix.

```code-button
---
caption: A bullet list
---
await require('/demoSetup.ts').changeSettings(app, { attachmentLinksDelimiter: '\n- ', attachmentLinksPrefix: '- ', attachmentLinksSuffix: '' });
```

Manual equivalent: set the prefix to `-` followed by a space, and the delimiter to a newline then `-` and a space.

```code-button
---
caption: Back to the defaults (one embed per paragraph)
---
await require('/demoSetup.ts').changeSettings(app, { attachmentLinksDelimiter: '\n\n', attachmentLinksPrefix: '', attachmentLinksSuffix: '' });
```

Manual equivalent: clear the prefix and suffix and set the delimiter to a blank line (two newlines).

Then insert again and compare:

```code-button
---
caption: Insert in the playground
---
await require('/demoSetup.ts').insertInPlayground(app);
```

```code-button
---
caption: Reset the playground
---
await require('/demoSetup.ts').resetPlayground(app);
```
