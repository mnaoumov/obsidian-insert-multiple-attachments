import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type {
  App,
  Editor,
  EditorSelection,
  TFile
} from 'obsidian';

import {
  EditorSelection as CodeMirrorEditorSelection,
  EditorState
} from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { PluginSettings } from './plugin-settings.ts';

import { InsertAttachmentsControl } from './insert-attachments-control.ts';
import {
  getPendingInsertionExtension,
  pendingInsertionField
} from './pending-insertion-field.ts';

// The real `convertAsyncToSync` wraps the change handler as fire-and-forget, so awaiting the registered
// listener would not await the inner async work. Stub it to identity (the sanctioned exception) so the test
// can capture and await the real `handleChange`. `basename`/`extname` are left as the real path utilities.
vi.mock('@mnaoumov/typescript-lib/async', async (importOriginal) => ({
  ...await importOriginal<typeof import('@mnaoumov/typescript-lib/async')>(),
  convertAsyncToSync: vi.fn(($function: (...$arguments: unknown[]) => unknown) => $function)
}));

interface CreateControlParams {
  readonly app?: App;
  readonly pluginSettingsComponent?: PluginSettingsComponent;
}

interface MockAppOverrides {
  readonly activeFile?: null | TFile;
  readonly generateLink?: string;
  readonly saveAttachment?: () => Promise<TFile>;
  readonly vaultFile?: null | TFile;
}

interface MockFile {
  readonly arrayBuffer: () => Promise<ArrayBuffer>;
  readonly name: string;
}

interface MockFileInput {
  readonly addEventListener: ReturnType<typeof vi.fn>;
  readonly click: ReturnType<typeof vi.fn>;
  readonly detach: ReturnType<typeof vi.fn>;
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Tests replace the selected files before firing the change event.
  files: MockFileList | null;
  readonly focus: ReturnType<typeof vi.fn>;
  readonly triggerCancel: () => void;
  readonly triggerChange: () => Promise<void>;
}

interface MockFileList {
  readonly [Symbol.iterator]: () => Iterator<MockFile>;
}

const NOTE_CONTENT = 'hello world';
const CURSOR_OFFSET = 5;
const NOTE = castTo<TFile>({ path: 'note.md' });

const RECORDED_SELECTIONS: readonly EditorSelection[] = [
  {
    anchor: { ch: 2, line: 1 },
    head: { ch: 5, line: 1 }
  }
];

let mockFileEl: MockFileInput;
let mockDocumentAddEventListener: ReturnType<typeof vi.fn>;
let mockDocumentRemoveEventListener: ReturnType<typeof vi.fn>;
let mockSetTimeout: ReturnType<typeof vi.fn>;
let mockClearTimeout: ReturnType<typeof vi.fn>;
let editorView: EditorView;
let showNotice: ReturnType<typeof vi.fn>;

function createControl(params?: CreateControlParams): InsertAttachmentsControl {
  return new InsertAttachmentsControl({
    app: params?.app ?? createMockApp(),
    editor: createMockEditor(),
    pluginNoticeComponent: createMockNoticeComponent(),
    pluginSettingsComponent: params?.pluginSettingsComponent ?? createMockComponent()
  });
}

function createMockApp(overrides?: MockAppOverrides): App {
  const activeFile = overrides && 'activeFile' in overrides ? overrides.activeFile : NOTE;
  const vaultFile = overrides && 'vaultFile' in overrides ? overrides.vaultFile : NOTE;
  const generateLink = overrides?.generateLink ?? '[[attachment.png]]';

  return castTo<App>({
    fileManager: {
      generateMarkdownLink: vi.fn().mockReturnValue(generateLink)
    },
    saveAttachment: overrides?.saveAttachment ?? vi.fn().mockResolvedValue({ path: 'attachments/attachment.png' }),
    vault: {
      getFileByPath: vi.fn().mockReturnValue(vaultFile),
      process: vi.fn()
    },
    workspace: {
      getActiveFile: vi.fn().mockReturnValue(activeFile)
    }
  });
}

function createMockComponent(overrides?: Partial<PluginSettings>): PluginSettingsComponent {
  return castTo<PluginSettingsComponent>({
    settings: {
      attachmentLinksDelimiter: '\n\n',
      attachmentLinksPrefix: '',
      attachmentLinksSuffix: '',
      ...overrides
    }
  });
}

function createMockEditor(): Editor {
  return castTo<Editor>({
    cm: editorView,
    focus: vi.fn(),
    listSelections: vi.fn().mockReturnValue(RECORDED_SELECTIONS),
    setSelections: vi.fn()
  });
}

function createMockFileEl(): MockFileInput {
  const el: MockFileInput = {
    addEventListener: vi.fn(),
    click: vi.fn(),
    detach: vi.fn(),
    files: null,
    focus: vi.fn(),
    triggerCancel: () => {
      const cancelCall = el.addEventListener.mock.calls.find((call: unknown[]) => call[0] === 'cancel');
      const cancelHandler = cancelCall?.[1] as (() => void) | undefined;
      cancelHandler?.();
    },
    triggerChange: async () => {
      const changeCall = el.addEventListener.mock.calls.find((call: unknown[]) => call[0] === 'change');
      const changeHandler = changeCall?.[1] as (() => Promise<void>) | undefined;
      await changeHandler?.();
    }
  };
  return el;
}

function createMockNoticeComponent(): PluginNoticeComponent {
  return castTo<PluginNoticeComponent>({ showNotice });
}

function getDoc(): string {
  return editorView.state.doc.toString();
}

function getPendingInsertionCount(): number {
  return editorView.state.field(pendingInsertionField).size;
}

function pickFiles(names: readonly string[]): void {
  const mockFiles: MockFile[] = names.map((name) => ({
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    name
  }));
  mockFileEl.files = {
    [Symbol.iterator]: (): IterableIterator<MockFile> => mockFiles[Symbol.iterator]()
  };
}

describe('InsertAttachmentsControl', () => {
  beforeEach(() => {
    mockDocumentAddEventListener = vi.fn();
    mockDocumentRemoveEventListener = vi.fn();
    mockSetTimeout = vi.fn().mockReturnValue(42);
    mockClearTimeout = vi.fn();
    showNotice = vi.fn();

    editorView = new EditorView({
      state: EditorState.create({
        doc: NOTE_CONTENT,
        extensions: getPendingInsertionExtension(),
        selection: CodeMirrorEditorSelection.cursor(CURSOR_OFFSET)
      })
    });
    activeDocument.body.append(editorView.dom);

    mockFileEl = createMockFileEl();

    vi.spyOn(activeDocument.body, 'createEl').mockReturnValue(castTo<HTMLInputElement>(mockFileEl));

    Object.defineProperties(activeDocument, {
      addEventListener: {
        configurable: true,
        value: mockDocumentAddEventListener
      },
      removeEventListener: {
        configurable: true,
        value: mockDocumentRemoveEventListener
      }
    });

    Object.defineProperties(window, {
      clearTimeout: {
        configurable: true,
        value: mockClearTimeout
      },
      setTimeout: {
        configurable: true,
        value: mockSetTimeout
      }
    });
  });

  afterEach(() => {
    editorView.destroy();
    editorView.dom.remove();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should create a file input element on construction', (): void => {
    createControl();

    expect(activeDocument.body.createEl).toHaveBeenCalledWith(
      'input',
      expect.objectContaining({
        cls: 'insert-multiple-attachments',
        type: 'file'
      })
    );
  });

  it('should focus and click the file input on construction', (): void => {
    createControl();

    expect(mockFileEl.focus).toHaveBeenCalled();
    expect(mockFileEl.click).toHaveBeenCalled();
  });

  it('should register focus and click handlers after a setTimeout', (): void => {
    createControl();

    const EXPECTED_SETTIMEOUT_CALLS = 1;
    expect(mockSetTimeout).toHaveBeenCalledTimes(EXPECTED_SETTIMEOUT_CALLS);

    const setTimeoutCallback = mockSetTimeout.mock.calls[0]?.[0] as (() => void) | undefined;
    expect(setTimeoutCallback).toBeDefined();
    setTimeoutCallback?.();

    expect(mockDocumentAddEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(mockDocumentAddEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('should detach file element when no files are selected', async (): Promise<void> => {
    createControl();
    mockFileEl.files = null;

    await mockFileEl.triggerChange();

    expect(mockFileEl.detach).toHaveBeenCalled();
  });

  it('should detach file element when no active file', async (): Promise<void> => {
    createControl({ app: createMockApp({ activeFile: null }) });
    pickFiles(['photo.png']);

    await mockFileEl.triggerChange();

    expect(mockFileEl.detach).toHaveBeenCalled();
    expect(getDoc()).toBe(NOTE_CONTENT);
  });

  it('should insert the link at the cursor', async (): Promise<void> => {
    createControl({ app: createMockApp({ generateLink: '![[attachment.png]]' }) });
    pickFiles(['photo.png']);

    await mockFileEl.triggerChange();

    expect(getDoc()).toBe('hello![[attachment.png]] world');
  });

  it('should prefix link with ! when it does not start with !', async (): Promise<void> => {
    createControl({ app: createMockApp({ generateLink: '[[attachment.png]]' }) });
    pickFiles(['photo.png']);

    await mockFileEl.triggerChange();

    expect(getDoc()).toBe('hello![[attachment.png]] world');
  });

  it('should apply prefix and suffix from settings', async (): Promise<void> => {
    createControl({
      app: createMockApp({ generateLink: '![[photo.png]]' }),
      pluginSettingsComponent: createMockComponent({
        attachmentLinksPrefix: 'START\n',
        attachmentLinksSuffix: '\nEND'
      })
    });
    pickFiles(['photo.png']);

    await mockFileEl.triggerChange();

    expect(getDoc()).toBe('helloSTART\n![[photo.png]]\nEND world');
  });

  it('should join multiple links with delimiter', async (): Promise<void> => {
    createControl({
      app: createMockApp({ generateLink: '![[file.png]]' }),
      pluginSettingsComponent: createMockComponent({ attachmentLinksDelimiter: '---' })
    });
    pickFiles(['file1.png', 'file2.png']);

    await mockFileEl.triggerChange();

    expect(getDoc()).toBe('hello![[file.png]]---![[file.png]] world');
  });

  it('should detach file element after inserting links', async (): Promise<void> => {
    createControl();
    pickFiles(['photo.png']);

    await mockFileEl.triggerChange();

    expect(mockFileEl.detach).toHaveBeenCalled();
  });

  it('should remove handlers when change fires', async (): Promise<void> => {
    createControl();

    const setTimeoutCallback = mockSetTimeout.mock.calls[0]?.[0] as (() => void) | undefined;
    setTimeoutCallback?.();

    mockFileEl.files = null;
    await mockFileEl.triggerChange();

    expect(mockDocumentRemoveEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(mockDocumentRemoveEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });

  it('should schedule detach after focus or click event', (): void => {
    createControl();

    const setTimeoutCallback = mockSetTimeout.mock.calls[0]?.[0] as (() => void) | undefined;
    setTimeoutCallback?.();

    const focusHandler = mockDocumentAddEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'focus'
    )?.[1] as (() => void) | undefined;
    expect(focusHandler).toBeDefined();

    mockSetTimeout.mockClear();
    focusHandler?.();

    const TIMEOUT_IN_MILLISECONDS = 5000;
    expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), TIMEOUT_IN_MILLISECONDS);
  });

  it('should clear existing timeout when focus or click fires again', (): void => {
    createControl();

    const setTimeoutCallback = mockSetTimeout.mock.calls[0]?.[0] as (() => void) | undefined;
    setTimeoutCallback?.();

    const focusHandler = mockDocumentAddEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'focus'
    )?.[1] as (() => void) | undefined;
    expect(focusHandler).toBeDefined();

    focusHandler?.();

    expect(mockClearTimeout).toHaveBeenCalled();
  });

  it('should restore the recorded selections and focus the editor once files are picked', async (): Promise<void> => {
    const editor = createMockEditor();
    new InsertAttachmentsControl({
      app: createMockApp(),
      editor,
      pluginNoticeComponent: createMockNoticeComponent(),
      pluginSettingsComponent: createMockComponent()
    });
    mockFileEl.files = null;

    await mockFileEl.triggerChange();

    expect(editor.setSelections).toHaveBeenCalledWith(RECORDED_SELECTIONS);
    expect(editor.focus).toHaveBeenCalled();
  });

  it('should restore the recorded selections before saving the attachments', async (): Promise<void> => {
    const app = createMockApp();
    const editor = createMockEditor();
    new InsertAttachmentsControl({
      app,
      editor,
      pluginNoticeComponent: createMockNoticeComponent(),
      pluginSettingsComponent: createMockComponent()
    });
    pickFiles(['photo.png']);

    await mockFileEl.triggerChange();

    const setSelectionsOrder = vi.mocked(editor.setSelections).mock.invocationCallOrder[0] ?? Infinity;
    const saveAttachmentOrder = vi.mocked(app.saveAttachment).mock.invocationCallOrder[0] ?? -Infinity;
    expect(setSelectionsOrder).toBeLessThan(saveAttachmentOrder);
  });

  it('should put the cursor after the links and focus the editor when the user did not edit meanwhile', async (): Promise<void> => {
    const editor = createMockEditor();
    new InsertAttachmentsControl({
      app: createMockApp({ generateLink: '![[a.png]]' }),
      editor,
      pluginNoticeComponent: createMockNoticeComponent(),
      pluginSettingsComponent: createMockComponent()
    });
    pickFiles(['photo.png']);
    vi.mocked(editor.focus).mockClear();

    await mockFileEl.triggerChange();

    expect(editorView.state.selection.main.head).toBe(CURSOR_OFFSET + '![[a.png]]'.length);
    expect(editor.focus).toHaveBeenCalledTimes(2);
  });

  it('should insert at the tracked point when the user edits the note while the attachments are saved', async (): Promise<void> => {
    const editor = createMockEditor();
    const app = createMockApp({
      generateLink: '![[a.png]]',
      saveAttachment: vi.fn(() => {
        // The user types above the insertion point, then at the end of the note, while the file is copied.
        editorView.dispatch({ changes: { from: 0, insert: 'Oh, ' } });
        editorView.dispatch({
          changes: { from: editorView.state.doc.length, insert: '!' },
          selection: CodeMirrorEditorSelection.cursor(editorView.state.doc.length + 1)
        });
        return Promise.resolve(castTo<TFile>({ path: 'a.png' }));
      })
    });
    new InsertAttachmentsControl({
      app,
      editor,
      pluginNoticeComponent: createMockNoticeComponent(),
      pluginSettingsComponent: createMockComponent()
    });
    pickFiles(['photo.png']);
    vi.mocked(editor.focus).mockClear();

    await mockFileEl.triggerChange();

    expect(getDoc()).toBe('Oh, hello![[a.png]] world!');
    // The user's own cursor stays where they were typing, and the editor's focus is left alone.
    expect(editorView.state.selection.main.head).toBe(getDoc().length);
    expect(editor.focus).toHaveBeenCalledTimes(1);
  });

  it('should show the pending insertion while the attachments are saved, and drop it afterwards', async (): Promise<void> => {
    let pendingCountWhileSaving = 0;
    let markerCountWhileSaving = 0;
    createControl({
      app: createMockApp({
        saveAttachment: vi.fn(() => {
          pendingCountWhileSaving = getPendingInsertionCount();
          markerCountWhileSaving = editorView.dom.querySelectorAll('.insert-multiple-attachments-pending').length;
          return Promise.resolve(castTo<TFile>({ path: 'a.png' }));
        })
      })
    });
    pickFiles(['photo.png']);

    await mockFileEl.triggerChange();

    expect(pendingCountWhileSaving).toBe(1);
    expect(markerCountWhileSaving).toBe(1);
    expect(getPendingInsertionCount()).toBe(0);
  });

  it('should drop the pending insertion and detach when saving fails', async (): Promise<void> => {
    createControl({
      app: createMockApp({ saveAttachment: vi.fn().mockRejectedValue(new Error('disk full')) })
    });
    pickFiles(['photo.png']);

    await expect(mockFileEl.triggerChange()).rejects.toThrow('disk full');

    expect(getPendingInsertionCount()).toBe(0);
    expect(mockFileEl.detach).toHaveBeenCalled();
    expect(getDoc()).toBe(NOTE_CONTENT);
  });

  it('should append the links to the note when its editor was closed meanwhile', async (): Promise<void> => {
    let processed = '';
    const app = createMockApp({
      generateLink: '![[a.png]]',
      saveAttachment: vi.fn(() => {
        editorView.dom.remove();
        return Promise.resolve(castTo<TFile>({ path: 'a.png' }));
      })
    });
    vi.mocked(app.vault.process).mockImplementation((_file, function_) => {
      processed = function_(NOTE_CONTENT);
      return Promise.resolve(processed);
    });
    createControl({ app });
    pickFiles(['photo.png']);

    await mockFileEl.triggerChange();

    expect(processed).toBe(`${NOTE_CONTENT}\n![[a.png]]`);
    expect(showNotice).toHaveBeenCalledWith(expect.stringContaining('added at its end'));
    expect(getDoc()).toBe(NOTE_CONTENT);
  });

  it.each([
    ['', '![[a.png]]'],
    ['hello\n', 'hello\n![[a.png]]']
  ])('should append the links to %j with no extra line break', async (closedNoteContent, expected): Promise<void> => {
    let processed = '';
    const app = createMockApp({
      generateLink: '![[a.png]]',
      saveAttachment: vi.fn(() => {
        editorView.dom.remove();
        return Promise.resolve(castTo<TFile>({ path: 'a.png' }));
      })
    });
    vi.mocked(app.vault.process).mockImplementation((_file, function_) => {
      processed = function_(closedNoteContent);
      return Promise.resolve(processed);
    });
    createControl({ app });
    pickFiles(['photo.png']);

    await mockFileEl.triggerChange();

    expect(processed).toBe(expected);
  });

  it('should append the links to the note when the editor switched to another note meanwhile', async (): Promise<void> => {
    const app = createMockApp({
      saveAttachment: vi.fn(() => {
        // Obsidian loads the next note into the same editor as a fresh state.
        editorView.setState(EditorState.create({ doc: 'other note', extensions: getPendingInsertionExtension() }));
        return Promise.resolve(castTo<TFile>({ path: 'a.png' }));
      })
    });
    createControl({ app });
    pickFiles(['photo.png']);

    await mockFileEl.triggerChange();

    expect(getDoc()).toBe('other note');
    expect(app.vault.process).toHaveBeenCalledWith(NOTE, expect.any(Function));
  });

  it('should not insert anything when the note was deleted meanwhile', async (): Promise<void> => {
    const app = createMockApp({ vaultFile: null });
    createControl({ app });
    pickFiles(['photo.png']);

    await mockFileEl.triggerChange();

    expect(getDoc()).toBe(NOTE_CONTENT);
    expect(app.vault.process).not.toHaveBeenCalled();
    expect(showNotice).toHaveBeenCalledWith(expect.stringContaining('deleted'));
    expect(getPendingInsertionCount()).toBe(0);
  });

  it('should restore the recorded selections, focus the editor and detach when the picker is cancelled', (): void => {
    const editor = createMockEditor();
    new InsertAttachmentsControl({
      app: createMockApp(),
      editor,
      pluginNoticeComponent: createMockNoticeComponent(),
      pluginSettingsComponent: createMockComponent()
    });

    mockFileEl.triggerCancel();

    expect(editor.setSelections).toHaveBeenCalledWith(RECORDED_SELECTIONS);
    expect(editor.focus).toHaveBeenCalled();
    expect(getDoc()).toBe(NOTE_CONTENT);
    expect(mockFileEl.detach).toHaveBeenCalled();
    expect(mockDocumentRemoveEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
  });
});
