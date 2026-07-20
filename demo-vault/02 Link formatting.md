[Docs](https://github.com/mnaoumov/obsidian-insert-multiple-attachments/)

# Link formatting

When the plugin inserts several attachments, it wraps the whole block and joins the individual embeds using three configurable pieces of text:

- **Prefix** - inserted once, before the first embed.
- **Delimiter** - inserted between each pair of embeds.
- **Suffix** - inserted once, after the last embed.

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
3. Re-run the command in [[Playground]] and watch how the embeds are joined.

For example, set the delimiter to a single space to place attachments side by side, or add a `-` prefix followed by a space, with a newline delimiter, to build a bullet list. Each field maps to a setting key documented in [[03 Settings]].
