import {
  EditorSelection,
  EditorState
} from '@codemirror/state';
import {
  describe,
  expect,
  it
} from 'vitest';

import {
  buildPendingInsertionDecorations,
  getPendingInsertionExtension,
  getPendingInsertionSelection,
  pendingInsertionEndEffect,
  pendingInsertionField,
  pendingInsertionStartEffect
} from './pending-insertion-field.ts';

function createState(): EditorState {
  return EditorState.create({ doc: 'hello world', extensions: getPendingInsertionExtension() });
}

describe('pendingInsertionField', () => {
  it('should track a selection through a change made before it', (): void => {
    let state = createState();
    state = state.update({ effects: pendingInsertionStartEffect.of({ id: 1, selection: EditorSelection.single(5) }) }).state;
    state = state.update({ changes: { from: 0, insert: 'Oh, ' } }).state;

    expect(getPendingInsertionSelection(state, 1)?.main.head).toBe(9);
  });

  it('should keep the point before text typed at it', (): void => {
    let state = createState();
    state = state.update({ effects: pendingInsertionStartEffect.of({ id: 1, selection: EditorSelection.single(5) }) }).state;
    state = state.update({ changes: { from: 5, insert: 'abc' } }).state;

    expect(getPendingInsertionSelection(state, 1)?.main.head).toBe(5);
  });

  it('should not map a selection added in the same transaction as a change', (): void => {
    let state = createState();
    state = state.update({
      changes: { from: 0, insert: 'Oh, ' },
      effects: pendingInsertionStartEffect.of({ id: 1, selection: EditorSelection.single(9) })
    }).state;

    expect(getPendingInsertionSelection(state, 1)?.main.head).toBe(9);
  });

  it('should keep insertions apart by id and remove only the one asked', (): void => {
    let state = createState();
    state = state.update({
      effects: [
        pendingInsertionStartEffect.of({ id: 1, selection: EditorSelection.single(1) }),
        pendingInsertionStartEffect.of({ id: 2, selection: EditorSelection.single(2) })
      ]
    }).state;
    state = state.update({ effects: pendingInsertionEndEffect.of(1) }).state;

    expect(getPendingInsertionSelection(state, 1)).toBeNull();
    expect(getPendingInsertionSelection(state, 2)?.main.head).toBe(2);
  });

  it('should ignore removing an id it does not track', (): void => {
    const state = createState();

    const nextState = state.update({ effects: pendingInsertionEndEffect.of(7) }).state;

    expect(nextState.field(pendingInsertionField)).toBe(state.field(pendingInsertionField));
  });

  it('should answer null for a state without the field', (): void => {
    expect(getPendingInsertionSelection(EditorState.create(), 1)).toBeNull();
  });

  it('should build one marker per range, sorted', (): void => {
    const decorations = buildPendingInsertionDecorations(
      new Map([
        [1, EditorSelection.create([EditorSelection.cursor(7), EditorSelection.cursor(2)])],
        [2, EditorSelection.single(4)]
      ])
    );
    const positions: number[] = [];
    decorations.between(0, 100, (from) => {
      positions.push(from);
    });

    expect(positions).toEqual([2, 4, 7]);
  });
});
