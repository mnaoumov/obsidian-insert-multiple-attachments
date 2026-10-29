import type {
  EditorSelection,
  EditorState,
  Extension
} from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
  StateEffect,
  StateField
} from '@codemirror/state';
import {
  Decoration,
  EditorView,
  WidgetType
} from '@codemirror/view';

const PENDING_INSERTION_CLASS = 'insert-multiple-attachments-pending';

interface AddPendingInsertionValue {
  readonly id: number;
  readonly selection: EditorSelection;
}

/**
 * Starts tracking where the links of one insertion will go.
 */
export const pendingInsertionStartEffect = StateEffect.define<AddPendingInsertionValue>();

/**
 * Stops tracking one insertion, by the id it was added with.
 */
export const pendingInsertionEndEffect = StateEffect.define<number>();

/**
 * Where the links of each insertion still in progress will go, keyed by the insertion's id.
 *
 * **The insertion point is mapped through every change rather than held as an offset beside the editor.**
 * Saving the picked files takes as long as copying them, and the user goes on editing meanwhile. A raw offset
 * drifts the moment a character is typed above it, so the links would land somewhere else, or split a word
 * typed meanwhile. Mapping through `tr.changes` keeps the point where the cursor was, and the user is never
 * locked out of the note while a large file copies.
 *
 * The map runs BEFORE the effects, so a selection added in the same transaction as a change is already in the
 * new document's coordinates and is not mapped a second time.
 *
 * Obsidian reuses one `EditorView` per leaf across file switches, but loads the next note as a fresh state, so
 * the field comes back empty there. A pending insertion missing from the field therefore means its note is no
 * longer in this editor.
 */
export const pendingInsertionField = StateField.define<ReadonlyMap<number, EditorSelection>>({
  create() {
    return new Map();
  },
  provide(field) {
    return EditorView.decorations.from(field, buildPendingInsertionDecorations);
  },
  update(pendingInsertions, tr) {
    let result = pendingInsertions;
    if (tr.docChanged && result.size > 0) {
      result = new Map([...result].map(([id, selection]) => [id, selection.map(tr.changes)]));
    }
    for (const effect of tr.effects) {
      if (effect.is(pendingInsertionStartEffect)) {
        result = new Map(result).set(effect.value.id, effect.value.selection);
      } else if (effect.is(pendingInsertionEndEffect) && result.has(effect.value)) {
        const next = new Map(result);
        next.delete(effect.value);
        result = next;
      }
    }
    return result;
  }
});

/**
 * The marker drawn where the links will go, so the user can see an insertion is still in progress there.
 */
class PendingInsertionWidget extends WidgetType {
  /**
   * Every marker looks the same, so CodeMirror never needs to replace one already in the DOM.
   *
   * @returns Always `true`.
   */
  public override eq(): boolean {
    return true;
  }

  /**
   * Builds the marker element.
   *
   * @returns The marker element.
   */
  public override toDOM(): HTMLElement {
    return createSpan({
      cls: PENDING_INSERTION_CLASS,
      text: 'Inserting attachments...'
    });
  }
}

/**
 * Builds the markers for every pending insertion.
 *
 * `side: -1` keeps the marker before text the user types at the same point, which is where the links will go.
 *
 * @param pendingInsertions - The pending insertions.
 * @returns The decoration set.
 */
export function buildPendingInsertionDecorations(pendingInsertions: ReadonlyMap<number, EditorSelection>): DecorationSet {
  const positions = [...pendingInsertions.values()].flatMap((selection) => selection.ranges.map((range) => range.to));
  return Decoration.set(
    positions.map((position) =>
      Decoration.widget({
        side: -1,
        widget: new PendingInsertionWidget()
      }).range(position)
    ),
    true
  );
}

/**
 * The editor extension to register once with `plugin.registerEditorExtension`.
 *
 * @returns The editor extension.
 */
export function getPendingInsertionExtension(): Extension {
  return pendingInsertionField;
}

/**
 * Reads where the links of one insertion will go.
 *
 * @param state - The editor state.
 * @param id - The insertion's id.
 * @returns The mapped selection, or `null` when this editor no longer tracks that insertion.
 */
export function getPendingInsertionSelection(state: EditorState, id: number): EditorSelection | null {
  return state.field(pendingInsertionField, false)?.get(id) ?? null;
}
