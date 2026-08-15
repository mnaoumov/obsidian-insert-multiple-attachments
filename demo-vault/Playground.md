# Playground

Use this note to try the plugin. Put your cursor on the empty line below, run **Insert Multiple Attachments: Invoke**, and select two or more files in the OS picker. Every file you choose is inserted here as its own embed.

<!-- Place your cursor below and run the command. -->

## Steps

The button does the first two steps - it opens this note, puts the cursor on the blank line above, and runs the command. The file picker that opens next is a native OS dialog, so choosing the files is still yours to do:

```code-button
---
caption: Put the cursor in place and run the insert command
---
await require('/demoSetup.ts').insertInPlayground(app);
```

```code-button
---
caption: Reset this note
---
await require('/demoSetup.ts').resetPlayground(app);
```

Manual equivalent of the reset: delete the embeds the command inserted.

1. Click the empty line under the heading above so the cursor is in this note.
2. Run **Insert Multiple Attachments: Invoke** from the Command Palette (`Ctrl/Cmd + P`).
3. In the OS file picker, select **more than one** file. You can navigate into this vault's `_assets/sample-attachments/` folder and pick `sample-one.txt` and `sample-two.txt`, or choose your own images.
4. Confirm. One embed per file appears at the cursor.

See [01 Insert multiple attachments](<./01 Insert multiple attachments.md>) for what happens and [02 Link formatting](<./02 Link formatting.md>) to change how the inserted links are joined.
