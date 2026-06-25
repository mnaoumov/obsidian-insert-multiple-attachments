import type {
  App,
  Editor
} from 'obsidian';

import { castTo } from 'obsidian-dev-utils/object-utils';
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

// The real `convertAsyncToSync` wraps the change handler as fire-and-forget, so awaiting the registered
// Listener would not await the inner async work. Stub it to identity (the sanctioned exception) so the test
// Can capture and await the real `handleChange`. `basename`/`extname` are left as the real path utilities.
vi.mock('obsidian-dev-utils/async', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian-dev-utils/async')>(),
  convertAsyncToSync: vi.fn((fn: (...args: unknown[]) => unknown) => fn)
}));

interface CreateControlParams {
  readonly app?: App;
  readonly pluginSettingsComponent?: PluginSettingsComponent;
}

interface MockActiveFile {
  readonly path: string;
}

interface MockAppOverrides {
  readonly activeFile?: MockActiveFile | null;
  readonly generateLink?: string;
}

interface MockFile {
  arrayBuffer(): Promise<ArrayBuffer>;
  readonly name: string;
}

interface MockFileInput {
  addEventListener: ReturnType<typeof vi.fn>;
  click: ReturnType<typeof vi.fn>;
  detach: ReturnType<typeof vi.fn>;
  files: MockFileList | null;
  focus: ReturnType<typeof vi.fn>;
  triggerChange(): Promise<void>;
}

interface MockFileList {
  [Symbol.iterator](): Iterator<MockFile>;
}

let mockFileEl: MockFileInput;
let mockDocumentAddEventListener: ReturnType<typeof vi.fn>;
let mockDocumentRemoveEventListener: ReturnType<typeof vi.fn>;
let mockSetTimeout: ReturnType<typeof vi.fn>;
let mockClearTimeout: ReturnType<typeof vi.fn>;

function createControl(params?: CreateControlParams): InsertAttachmentsControl {
  const app = params?.app ?? createMockApp();
  const editor = castTo<Editor>({ replaceSelection: vi.fn() });
  const pluginSettingsComponent = params?.pluginSettingsComponent ?? createMockComponent();

  return new InsertAttachmentsControl({
    app,
    editor,
    pluginSettingsComponent
  });
}

function createMockApp(overrides?: MockAppOverrides): App {
  const activeFile = 'activeFile' in (overrides ?? {}) ? overrides?.activeFile : { path: 'note.md' };
  const generateLink = overrides?.generateLink ?? '[[attachment.png]]';

  return castTo<App>({
    fileManager: {
      generateMarkdownLink: vi.fn().mockReturnValue(generateLink)
    },
    saveAttachment: vi.fn().mockResolvedValue({ path: 'attachments/attachment.png' }),
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

function createMockFileEl(): MockFileInput {
  const el: MockFileInput = {
    addEventListener: vi.fn(),
    click: vi.fn(),
    detach: vi.fn(),
    files: null,
    focus: vi.fn(),
    triggerChange: async () => {
      const changeCall = el.addEventListener.mock.calls.find((call: unknown[]) => call[0] === 'change');
      const changeHandler = changeCall?.[1] as (() => Promise<void>) | undefined;
      await changeHandler?.();
    }
  };
  return el;
}

describe('InsertAttachmentsControl', () => {
  beforeEach(() => {
    mockDocumentAddEventListener = vi.fn();
    mockDocumentRemoveEventListener = vi.fn();
    mockSetTimeout = vi.fn().mockReturnValue(42);
    mockClearTimeout = vi.fn();

    mockFileEl = createMockFileEl();

    vi.spyOn(activeDocument.body, 'createEl').mockReturnValue(castTo<HTMLInputElement>(mockFileEl));

    Object.defineProperty(activeDocument, 'addEventListener', {
      configurable: true,
      value: mockDocumentAddEventListener
    });

    Object.defineProperty(activeDocument, 'removeEventListener', {
      configurable: true,
      value: mockDocumentRemoveEventListener
    });

    Object.defineProperty(window, 'setTimeout', {
      configurable: true,
      value: mockSetTimeout
    });

    Object.defineProperty(window, 'clearTimeout', {
      configurable: true,
      value: mockClearTimeout
    });
  });

  afterEach(() => {
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
    const app = createMockApp({ activeFile: null });
    createControl({ app });

    const mockFiles: MockFile[] = [{ arrayBuffer: vi.fn(), name: 'photo.png' }];
    mockFileEl.files = {
      [Symbol.iterator]: (): IterableIterator<MockFile> => mockFiles[Symbol.iterator]()
    };

    await mockFileEl.triggerChange();

    expect(mockFileEl.detach).toHaveBeenCalled();
  });

  it('should insert link for each selected file', async (): Promise<void> => {
    const app = createMockApp({ generateLink: '![[attachment.png]]' });
    const editor = castTo<Editor>({ replaceSelection: vi.fn() });
    const pluginSettingsComponent = createMockComponent();

    new InsertAttachmentsControl({ app, editor, pluginSettingsComponent });

    const mockData = new ArrayBuffer(8);
    const mockFiles: MockFile[] = [
      { arrayBuffer: vi.fn().mockResolvedValue(mockData), name: 'photo.png' }
    ];
    mockFileEl.files = {
      [Symbol.iterator]: (): IterableIterator<MockFile> => mockFiles[Symbol.iterator]()
    };

    await mockFileEl.triggerChange();

    expect(editor.replaceSelection).toHaveBeenCalledWith('![[attachment.png]]');
  });

  it('should prefix link with ! when it does not start with !', async (): Promise<void> => {
    const app = createMockApp({ generateLink: '[[attachment.png]]' });
    const editor = castTo<Editor>({ replaceSelection: vi.fn() });
    const pluginSettingsComponent = createMockComponent();

    new InsertAttachmentsControl({ app, editor, pluginSettingsComponent });

    const mockData = new ArrayBuffer(8);
    const mockFiles: MockFile[] = [
      { arrayBuffer: vi.fn().mockResolvedValue(mockData), name: 'photo.png' }
    ];
    mockFileEl.files = {
      [Symbol.iterator]: (): IterableIterator<MockFile> => mockFiles[Symbol.iterator]()
    };

    await mockFileEl.triggerChange();

    expect(editor.replaceSelection).toHaveBeenCalledWith('![[attachment.png]]');
  });

  it('should not double-prefix ! when link already starts with !', async (): Promise<void> => {
    const app = createMockApp({ generateLink: '![[attachment.png]]' });
    const editor = castTo<Editor>({ replaceSelection: vi.fn() });
    const pluginSettingsComponent = createMockComponent();

    new InsertAttachmentsControl({ app, editor, pluginSettingsComponent });

    const mockData = new ArrayBuffer(8);
    const mockFiles: MockFile[] = [
      { arrayBuffer: vi.fn().mockResolvedValue(mockData), name: 'photo.png' }
    ];
    mockFileEl.files = {
      [Symbol.iterator]: (): IterableIterator<MockFile> => mockFiles[Symbol.iterator]()
    };

    await mockFileEl.triggerChange();

    expect(editor.replaceSelection).toHaveBeenCalledWith('![[attachment.png]]');
  });

  it('should apply prefix and suffix from settings', async (): Promise<void> => {
    const app = createMockApp({ generateLink: '![[photo.png]]' });
    const editor = castTo<Editor>({ replaceSelection: vi.fn() });
    const pluginSettingsComponent = createMockComponent({
      attachmentLinksPrefix: 'START\n',
      attachmentLinksSuffix: '\nEND'
    });

    new InsertAttachmentsControl({ app, editor, pluginSettingsComponent });

    const mockData = new ArrayBuffer(8);
    const mockFiles: MockFile[] = [
      { arrayBuffer: vi.fn().mockResolvedValue(mockData), name: 'photo.png' }
    ];
    mockFileEl.files = {
      [Symbol.iterator]: (): IterableIterator<MockFile> => mockFiles[Symbol.iterator]()
    };

    await mockFileEl.triggerChange();

    expect(editor.replaceSelection).toHaveBeenCalledWith('START\n![[photo.png]]\nEND');
  });

  it('should join multiple links with delimiter', async (): Promise<void> => {
    const app = createMockApp({ generateLink: '![[file.png]]' });
    const editor = castTo<Editor>({ replaceSelection: vi.fn() });
    const pluginSettingsComponent = createMockComponent({ attachmentLinksDelimiter: '---' });

    new InsertAttachmentsControl({ app, editor, pluginSettingsComponent });

    const mockData = new ArrayBuffer(8);
    const mockFiles: MockFile[] = [
      { arrayBuffer: vi.fn().mockResolvedValue(mockData), name: 'file1.png' },
      { arrayBuffer: vi.fn().mockResolvedValue(mockData), name: 'file2.png' }
    ];
    mockFileEl.files = {
      [Symbol.iterator]: (): IterableIterator<MockFile> => mockFiles[Symbol.iterator]()
    };

    await mockFileEl.triggerChange();

    expect(editor.replaceSelection).toHaveBeenCalledWith('![[file.png]]---![[file.png]]');
  });

  it('should detach file element after inserting links', async (): Promise<void> => {
    const app = createMockApp();
    createControl({ app });

    const mockData = new ArrayBuffer(8);
    const mockFiles: MockFile[] = [
      { arrayBuffer: vi.fn().mockResolvedValue(mockData), name: 'photo.png' }
    ];
    mockFileEl.files = {
      [Symbol.iterator]: (): IterableIterator<MockFile> => mockFiles[Symbol.iterator]()
    };

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
});
