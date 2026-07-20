[Docs](https://github.com/mnaoumov/obsidian-insert-multiple-attachments/)

# Insert multiple attachments

Obsidian's built-in **Insert attachment** command opens a file picker that only accepts **one** file. This plugin adds a command that opens a **multi-select** picker instead, so a single run can insert **many attachments at once**.

## Try it

1. Open [[Playground]] and place the cursor where the attachments should go.
2. Run **Insert Multiple Attachments: Invoke** from the Command Palette.
3. In the OS picker, select **two or more** files - hold `Ctrl`/`Cmd` (or `Shift`) to multi-select. For a quick test, pick `sample-one.txt` and `sample-two.txt` from this vault's `_assets/sample-attachments/` folder, or select a couple of your own images.
4. Confirm. Each selected file is copied into the vault's attachment folder (`_assets/attachments/`) and inserted at the cursor as its own embed.

## What happens

- Every chosen file is saved as an attachment, exactly as Obsidian's single-file command would do - just for **all** of them in one go.
- Each attachment is inserted as an **embed** (a `!`-prefixed link), so images render inline and other files show as embedded file links.
- The individual embeds are joined together using the prefix, delimiter, and suffix from the plugin settings - see [[02 Link formatting]] and [[03 Settings]].

Images are the most visual demo, but any file type works. The plugin honours your vault's **attachment folder** setting for where the copied files land.
