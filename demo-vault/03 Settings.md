[Docs](https://github.com/mnaoumov/obsidian-insert-multiple-attachments/)

# Settings

Open **Settings -> Community plugins -> Insert Multiple Attachments** to configure the plugin. Each option below lists the setting key stored in the plugin's `data.json`. The link-formatting options control how the inserted embeds are joined together - see [[02 Link formatting]] for a walkthrough.

## Link formatting

- `attachmentLinksPrefix` - the text inserted once, before the first attachment link. Empty by default.
- `attachmentLinksDelimiter` - the text inserted between attachment links. A blank line (two newlines) by default, so each attachment lands on its own paragraph.
- `attachmentLinksSuffix` - the text inserted once, after the last attachment link. Empty by default.

In the settings UI, spaces are shown as `␣` and newlines as `↵` so whitespace-only values remain visible; press `Enter` inside a field to insert a newline.

## Entry points

- `shouldShowRibbonIcon` - show the paperclip ribbon icon in the left sidebar. Enabled by default. Clicking it inserts attachments into the active note.
- `shouldShowInEditorContextMenu` - show the **Insert multiple attachments** item in the editor right-click menu. Enabled by default.

Both entry points run the same action as the **Insert Multiple Attachments: Invoke** command - see [[01 Insert multiple attachments]].
