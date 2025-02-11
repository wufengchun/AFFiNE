import { ParagraphBlockModel } from '@blocksuite/affine-model';
import {
  calculateCollapsedSiblings,
  matchFlavours,
} from '@blocksuite/affine-shared/utils';
import type { Command } from '@blocksuite/block-std';

/**
 * @example
 * before unindent:
 * - aaa
 *   - bbb
 *   - ccc|
 *     - ddd
 *   - eee
 *
 * after unindent:
 * - aaa
 *   - bbb
 * - ccc|
 *   - ddd
 *   - eee
 */
export const dedentBlock: Command<{
  blockId?: string;
  stopCapture?: boolean;
}> = (ctx, next) => {
  let { blockId } = ctx;
  const { std, stopCapture = true } = ctx;
  const { store } = std;
  if (!blockId) {
    const sel = std.selection.getGroup('note').at(0);
    blockId = sel?.blockId;
  }
  if (!blockId) return;
  const model = std.store.getBlock(blockId)?.model;
  if (!model) return;

  const parent = store.getParent(model);
  const grandParent = parent && store.getParent(parent);
  if (store.readonly || !parent || parent.role !== 'content' || !grandParent) {
    // Top most, can not unindent, do nothing
    return;
  }

  if (stopCapture) store.captureSync();

  if (
    matchFlavours(model, [ParagraphBlockModel]) &&
    model.type.startsWith('h') &&
    model.collapsed
  ) {
    const collapsedSiblings = calculateCollapsedSiblings(model);
    store.moveBlocks([model, ...collapsedSiblings], grandParent, parent, false);
    return next();
  }

  try {
    const nextSiblings = store.getNexts(model);
    store.moveBlocks(nextSiblings, model);
    store.moveBlocks([model], grandParent, parent, false);
  } catch {
    return;
  }

  return next();
};
