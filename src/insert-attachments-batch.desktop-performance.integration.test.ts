/**
 * @file
 *
 * Performance suite for inserting a batch of attachments on a vault the size of a real one.
 *
 * It drives the real command with 20 picked files: the native picker is suppressed by shadowing
 * `HTMLInputElement.prototype.click`, and its closing is simulated by dispatching the `change` event the browser would
 * fire, as in the cursor suite. It times the batch and its phases, and checks the batch's shape: every picked file is
 * read before the first save, so the reads overlap rather than queue behind each save, and the links reach the note in
 * one editor transaction. `IMA_PERF_FILLER_FILE_COUNT` sizes the vault (default 20,000 empty notes).
 *
 * Desktop only: a performance figure is only comparable on one platform, and the desktop one is where the owner's
 * large vault lives.
 */

import {
  evalInObsidian,
  pollInObsidian
} from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import { PERFORMANCE_VAULT_FILLER_FILE_COUNT } from '../scripts/helpers/generate-performance-vault.ts';

const COMMAND_ID = 'insert-multiple-attachments:invoke';
const BATCH_SIZE = 20;
const FILE_SIZE_IN_BYTES = 65_536;
const INDEX_WAIT_IN_MS = 600_000;
const CACHE_CLEAN_WAIT_IN_MS = 180_000;
const INDEX_POLL_IN_MS = 2000;
const SCENARIO_TIMEOUT_IN_MS = 900_000;
/*
 * A loose bound, so a busy machine does not fail it: an idle one saves a file in a few milliseconds. The bound is per
 * file and holds whatever the vault size.
 */
const PER_FILE_BUDGET_IN_MS = 150;

interface BatchResult {
  readonly batchMs: number;
  readonly editorChangeCount: number;
  readonly error: null | string;
  readonly firstSaveAtMs: number;
  readonly insertedLinkCount: number;
  readonly lastReadStartAtMs: number;
  readonly phaseCalls: Readonly<Record<string, number>>;
  readonly phaseMs: Readonly<Record<string, number>>;
  readonly readCount: number;
  readonly vaultFileCount: number;
}

interface DispatchSpecLike {
  readonly changes?: unknown;
}

describe('Inserting a batch of attachments', () => {
  it('reads every file up front, writes the links in one transaction, and stays within a per-file budget', async () => {
    const vaultPath = getTemporaryVault().path;
    await pollInObsidian({
      intervalInMilliseconds: INDEX_POLL_IN_MS,
      poll: ({ app }) => app.vault.getFiles().length,
      timeoutInMilliseconds: INDEX_WAIT_IN_MS,
      timeoutMessage: `The vault was not indexed within ${String(INDEX_WAIT_IN_MS)} ms`,
      until: (fileCount) => fileCount >= PERFORMANCE_VAULT_FILLER_FILE_COUNT,
      vaultPath
    });
    // Until the metadata cache has parsed every note, each save competes with that parse.
    await pollInObsidian({
      intervalInMilliseconds: INDEX_POLL_IN_MS,
      poll: ({ app }) => app.metadataCache.isCacheClean(),
      timeoutInMilliseconds: CACHE_CLEAN_WAIT_IN_MS,
      timeoutMessage: 'The metadata cache did not settle',
      until: (isClean) => isClean,
      vaultPath
    });

    const result = await evalInObsidian({
      async callback({
        app,
        batchSize,
        commandId,
        fileSizeInBytes,
        lib: { waitUntil },
        obsidianModule
      }): Promise<BatchResult> {
        type AnyMethod = (this: unknown, ...callArguments: unknown[]) => unknown;
        const WAIT_TIMEOUT_IN_MILLISECONDS = 120_000;
        const phaseMs: Record<string, number> = {};
        const phaseCalls: Record<string, number> = {};
        const restorers: (() => void)[] = [];
        let start = performance.now();
        const readStartAtMs: number[] = [];
        const saveStartAtMs: number[] = [];
        let editorChangeCount = 0;

        function recordPhase(phase: string, phaseStart: number): void {
          phaseMs[phase] = (phaseMs[phase] ?? 0) + performance.now() - phaseStart;
        }

        function time(target: object, methodName: string, phase: string, onStart?: () => void): void {
          const record = target as Record<string, unknown>;
          const hasOwnMethod = Object.hasOwn(record, methodName);
          const ownValue = record[methodName];
          const original = record[methodName] as AnyMethod;
          record[methodName] = function timedMethod(this: unknown, ...callArguments: unknown[]): unknown {
            const phaseStart = performance.now();
            phaseCalls[phase] = (phaseCalls[phase] ?? 0) + 1;
            onStart?.();
            const value = original.apply(this, callArguments);
            if (value instanceof Promise) {
              return value.finally(() => {
                recordPhase(phase, phaseStart);
              });
            }
            recordPhase(phase, phaseStart);
            return value;
          };
          restorers.push(() => {
            if (hasOwnMethod) {
              record[methodName] = ownValue;
            } else {
              Reflect.deleteProperty(record, methodName);
            }
          });
        }

        const stamp = Date.now().toString();
        const empty: BatchResult = {
          batchMs: -1,
          editorChangeCount: -1,
          error: null,
          firstSaveAtMs: -1,
          insertedLinkCount: -1,
          lastReadStartAtMs: -1,
          phaseCalls: {},
          phaseMs: {},
          readCount: -1,
          vaultFileCount: app.vault.getFiles().length
        };

        const note = await app.vault.create(`ima-batch-${stamp}.md`, '');
        const leaf = app.workspace.getLeaf(true);
        try {
          await leaf.openFile(note, { state: { mode: 'source' } });
          await app.workspace.revealLeaf(leaf);
          await waitUntil({
            message: 'note did not become the active editor',
            predicate: () => app.workspace.getActiveViewOfType(obsidianModule.MarkdownView)?.file === note,
            timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
          });
          const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
          if (!view) {
            return { ...empty, error: 'No markdown view on the opened note' };
          }

          const files: File[] = [];
          for (let index = 0; index < batchSize; index++) {
            files.push(new File([new Uint8Array(fileSizeInBytes).fill(index)], `ima-batch-${stamp}-${String(index)}.png`, { type: 'image/png' }));
          }

          time(File.prototype, 'arrayBuffer', 'File.arrayBuffer', () => {
            readStartAtMs.push(performance.now() - start);
          });
          time(app, 'saveAttachment', 'app.saveAttachment', () => {
            saveStartAtMs.push(performance.now() - start);
          });
          time(app.vault, 'getAvailablePathForAttachments', 'vault.getAvailablePathForAttachments');
          time(app.vault, 'createBinary', 'vault.createBinary');
          time(app.vault, 'exists', 'vault.exists');
          time(app.fileManager, 'generateMarkdownLink', 'fileManager.generateMarkdownLink');

          // Every editor transaction that changes the note's text.
          const editorViewUnknown: unknown = view.editor.cm;
          const editorView = editorViewUnknown as Record<string, unknown>;
          const dispatchOriginal = editorView['dispatch'] as AnyMethod;
          editorView['dispatch'] = function dispatch(this: unknown, ...specs: unknown[]): unknown {
            if (specs.some((spec) => (spec as DispatchSpecLike).changes !== undefined)) {
              editorChangeCount++;
            }
            return dispatchOriginal.apply(this, specs);
          };
          restorers.push(() => {
            Reflect.deleteProperty(editorView, 'dispatch');
          });

          HTMLInputElement.prototype.click = (): void => {
            // Intentionally suppress the native file picker during the test.
          };
          restorers.push(() => {
            Reflect.deleteProperty(HTMLInputElement.prototype, 'click');
          });

          view.editor.focus();
          app.commands.executeCommandById(commandId);
          const input = document.querySelector<HTMLInputElement>('input.insert-multiple-attachments');
          if (!input) {
            return { ...empty, error: 'The file input was not created' };
          }
          const dataTransfer = new DataTransfer();
          for (const file of files) {
            dataTransfer.items.add(file);
          }
          input.files = dataTransfer.files;

          const lastFileName = files.at(-1)?.name ?? '';
          start = performance.now();
          input.dispatchEvent(new Event('change'));
          await waitUntil({
            message: 'the links were not inserted',
            predicate: () => view.editor.getValue().includes(lastFileName),
            timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
          });
          const batchMs = performance.now() - start;

          return {
            ...empty,
            batchMs,
            editorChangeCount,
            firstSaveAtMs: saveStartAtMs[0] ?? -1,
            insertedLinkCount: (view.editor.getValue().match(/!\[/g) ?? []).length,
            lastReadStartAtMs: readStartAtMs.at(-1) ?? -1,
            phaseCalls,
            phaseMs,
            readCount: readStartAtMs.length
          };
        } catch (error) {
          return { ...empty, error: String(error) };
        } finally {
          for (const restore of restorers.reverse()) {
            restore();
          }
          document.querySelector('input.insert-multiple-attachments')?.remove();
          leaf.detach();
          for (const file of app.vault.getFiles()) {
            if (file.name.startsWith(`ima-batch-${stamp}`)) {
              await app.fileManager.trashFile(file);
            }
          }
        }
      },
      input: {
        batchSize: BATCH_SIZE,
        commandId: COMMAND_ID,
        fileSizeInBytes: FILE_SIZE_IN_BYTES
      },
      vaultPath
    });

    // `console.warn` is the only console level the lint config permits here, and it keeps the numbers visible on a pass.
    console.warn('Insert-attachments batch:', JSON.stringify(result, null, 2));

    expect(result.error).toBeNull();
    expect(result.insertedLinkCount).toBe(BATCH_SIZE);
    // The whole batch reaches the note in one editor transaction, so it is one undo step and typing cannot split it.
    expect(result.editorChangeCount).toBe(1);
    // Every picked file is read before the first save, so the reads overlap instead of queueing behind each save.
    expect(result.readCount).toBe(BATCH_SIZE);
    expect(result.lastReadStartAtMs).toBeLessThanOrEqual(result.firstSaveAtMs);
    expect(result.batchMs).toBeLessThan(BATCH_SIZE * PER_FILE_BUDGET_IN_MS);
  }, SCENARIO_TIMEOUT_IN_MS);
});
