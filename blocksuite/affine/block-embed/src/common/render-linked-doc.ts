import { getSurfaceBlock } from '@blocksuite/affine-block-surface';
import {
  type DocMode,
  type ImageBlockModel,
  NoteDisplayMode,
} from '@blocksuite/affine-model';
import { EMBED_CARD_HEIGHT } from '@blocksuite/affine-shared/consts';
import { NotificationProvider } from '@blocksuite/affine-shared/services';
import { matchFlavours, SpecProvider } from '@blocksuite/affine-shared/utils';
import { BlockStdScope } from '@blocksuite/block-std';
import { assertExists } from '@blocksuite/global/utils';
import {
  type BlockModel,
  type Blocks,
  type BlockSnapshot,
  type DraftModel,
  type Query,
  Slice,
  Store,
  Text,
} from '@blocksuite/store';
import { render, type TemplateResult } from 'lit';

import type { EmbedLinkedDocBlockComponent } from '../embed-linked-doc-block/index.js';
import type { EmbedSyncedDocCard } from '../embed-synced-doc-block/components/embed-synced-doc-card.js';

// Throttle delay for block updates to reduce unnecessary re-renders
// - Prevents rapid-fire updates when multiple blocks are updated in quick succession
// - Ensures UI remains responsive while maintaining performance
// - Small enough to feel instant to users, large enough to batch updates effectively
export const RENDER_CARD_THROTTLE_MS = 60;

export function renderLinkedDocInCard(
  card: EmbedLinkedDocBlockComponent | EmbedSyncedDocCard
) {
  const linkedDoc = card.linkedDoc;
  assertExists(
    linkedDoc,
    `Trying to load page ${card.model.pageId} in linked page block, but the page is not found.`
  );

  // eslint-disable-next-line sonarjs/no-collapsible-if
  if ('bannerContainer' in card) {
    if (card.editorMode === 'page') {
      renderPageAsBanner(card).catch(e => {
        console.error(e);
        card.isError = true;
      });
    }
  }

  renderNoteContent(card).catch(e => {
    console.error(e);
    card.isError = true;
  });
}

async function renderPageAsBanner(card: EmbedSyncedDocCard) {
  const linkedDoc = card.linkedDoc;
  assertExists(
    linkedDoc,
    `Trying to load page ${card.model.pageId} in linked page block, but the page is not found.`
  );

  const notes = getNotesFromDoc(linkedDoc);
  if (!notes) {
    card.isBannerEmpty = true;
    return;
  }

  const target = notes.flatMap(note =>
    note.children.filter(child => matchFlavours(child, ['affine:image']))
  )[0];

  if (target) {
    await renderImageAsBanner(card, target);
    return;
  }

  card.isBannerEmpty = true;
}

async function renderImageAsBanner(
  card: EmbedSyncedDocCard,
  image: BlockModel
) {
  const sourceId = (image as ImageBlockModel).sourceId;
  if (!sourceId) return;

  const storage = card.linkedDoc?.blobSync;
  if (!storage) return;

  const blob = await storage.get(sourceId);
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const $img = document.createElement('img');
  $img.src = url;
  await addCover(card, $img);

  card.isBannerEmpty = false;
}

async function addCover(
  card: EmbedSyncedDocCard,
  cover: HTMLElement | TemplateResult<1>
) {
  const coverContainer = await card.bannerContainer;
  if (!coverContainer) return;
  while (coverContainer.firstChild) {
    coverContainer.firstChild.remove();
  }

  if (cover instanceof HTMLElement) {
    coverContainer.append(cover);
  } else {
    render(cover, coverContainer);
  }
}

async function renderNoteContent(
  card: EmbedLinkedDocBlockComponent | EmbedSyncedDocCard
) {
  card.isNoteContentEmpty = true;

  const doc = card.linkedDoc;
  assertExists(
    doc,
    `Trying to load page ${card.model.pageId} in linked page block, but the page is not found.`
  );

  const notes = getNotesFromDoc(doc);
  if (!notes) {
    return;
  }

  const cardStyle = card.model.style;
  const isHorizontal = cardStyle === 'horizontal';
  const allowFlavours: (keyof BlockSuite.BlockModels)[] = isHorizontal
    ? []
    : ['affine:image'];

  const noteChildren = notes.flatMap(note =>
    note.children.filter(model => {
      if (matchFlavours(model, allowFlavours)) {
        return true;
      }
      return filterTextModel(model);
    })
  );

  if (!noteChildren.length) {
    return;
  }

  card.isNoteContentEmpty = false;

  const noteContainer = await card.noteContainer;

  if (!noteContainer) {
    return;
  }

  while (noteContainer.firstChild) {
    noteContainer.firstChild.remove();
  }

  const noteBlocksContainer = document.createElement('div');
  noteBlocksContainer.classList.add('affine-embed-doc-content-note-blocks');
  noteBlocksContainer.contentEditable = 'false';
  noteContainer.append(noteBlocksContainer);

  if (isHorizontal) {
    // When the card is horizontal, we only render the first block
    noteChildren.splice(1);
  } else {
    // Before rendering, we can not know the height of each block
    // But we can limit the number of blocks to render simply by the height of the card
    const cardHeight = EMBED_CARD_HEIGHT[cardStyle];
    const minSingleBlockHeight = 20;
    const maxBlockCount = Math.floor(cardHeight / minSingleBlockHeight);
    if (noteChildren.length > maxBlockCount) {
      noteChildren.splice(maxBlockCount);
    }
  }
  const childIds = noteChildren.map(child => child.id);
  const ids: string[] = [];
  childIds.forEach(block => {
    let parent: string | null = block;
    while (parent && !ids.includes(parent)) {
      ids.push(parent);
      parent = doc.getParent(parent)?.id ?? null;
    }
  });
  const query: Query = {
    mode: 'strict',
    match: ids.map(id => ({ id, viewType: 'display' })),
  };
  const previewDoc = doc.doc.getBlocks({ query });
  const previewSpec = SpecProvider.getInstance().getSpec('page:preview');
  const store = new Store({ blocks: previewDoc });
  const previewStd = new BlockStdScope({
    store,
    extensions: previewSpec.value,
  });
  const previewTemplate = previewStd.render();
  const fragment = document.createDocumentFragment();
  render(previewTemplate, fragment);
  noteBlocksContainer.append(fragment);
  const contentEditableElements = noteBlocksContainer.querySelectorAll(
    '[contenteditable="true"]'
  );
  contentEditableElements.forEach(element => {
    (element as HTMLElement).contentEditable = 'false';
  });
}

function filterTextModel(model: BlockModel) {
  if (matchFlavours(model, ['affine:paragraph', 'affine:list'])) {
    return !!model.text?.toString().length;
  }
  return false;
}

export function getNotesFromDoc(doc: Blocks) {
  const notes = doc.root?.children.filter(
    child =>
      matchFlavours(child, ['affine:note']) &&
      child.displayMode !== NoteDisplayMode.EdgelessOnly
  );

  if (!notes || !notes.length) {
    return null;
  }

  return notes;
}

export function isEmptyDoc(doc: Blocks | null, mode: DocMode) {
  if (!doc) {
    return true;
  }

  if (mode === 'page') {
    const notes = getNotesFromDoc(doc);
    if (!notes || !notes.length) {
      return true;
    }
    return notes.every(note => isEmptyNote(note));
  } else {
    const surface = getSurfaceBlock(doc);
    if (surface?.elementModels.length || doc.blockSize > 2) {
      return false;
    }
    return true;
  }
}

export function isEmptyNote(note: BlockModel) {
  return note.children.every(block => {
    return (
      block.flavour === 'affine:paragraph' &&
      (!block.text || block.text.length === 0)
    );
  });
}

/**
 * Gets the document content with a max length.
 */
export function getDocContentWithMaxLength(doc: Blocks, maxlength = 500) {
  const notes = getNotesFromDoc(doc);
  if (!notes) return;

  const noteChildren = notes.flatMap(note =>
    note.children.filter(model => filterTextModel(model))
  );
  if (!noteChildren.length) return;

  let count = 0;
  let reached = false;
  const texts = [];

  for (const model of noteChildren) {
    let t = model.text?.toString();
    if (t?.length) {
      const c: number = count + Math.max(0, texts.length - 1);

      if (t.length + c > maxlength) {
        t = t.substring(0, maxlength - c);
        reached = true;
      }

      texts.push(t);
      count += t.length;

      if (reached) {
        break;
      }
    }
  }

  return texts.join('\n');
}

export function getTitleFromSelectedModels(selectedModels: DraftModel[]) {
  const firstBlock = selectedModels[0];
  if (
    matchFlavours(firstBlock, ['affine:paragraph']) &&
    firstBlock.type.startsWith('h')
  ) {
    return firstBlock.text.toString();
  }
  return undefined;
}

export function promptDocTitle(std: BlockStdScope, autofill?: string) {
  const notification = std.getOptional(NotificationProvider);
  if (!notification) return Promise.resolve(undefined);

  return notification.prompt({
    title: 'Create linked doc',
    message: 'Enter a title for the new doc.',
    placeholder: 'Untitled',
    autofill,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
  });
}

export function notifyDocCreated(std: BlockStdScope, doc: Blocks) {
  const notification = std.getOptional(NotificationProvider);
  if (!notification) return;

  const abortController = new AbortController();
  const clear = () => {
    doc.history.off('stack-item-added', addHandler);
    doc.history.off('stack-item-popped', popHandler);
    disposable.dispose();
  };
  const closeNotify = () => {
    abortController.abort();
    clear();
  };

  // edit or undo or switch doc, close notify toast
  const addHandler = doc.history.on('stack-item-added', closeNotify);
  const popHandler = doc.history.on('stack-item-popped', closeNotify);
  const disposable = std.host.slots.unmounted.on(closeNotify);

  notification.notify({
    title: 'Linked doc created',
    message: 'You can click undo to recovery block content',
    accent: 'info',
    duration: 10 * 1000,
    action: {
      label: 'Undo',
      onClick: () => {
        doc.undo();
        clear();
      },
    },
    abort: abortController.signal,
    onClose: clear,
  });
}

export async function convertSelectedBlocksToLinkedDoc(
  std: BlockStdScope,
  doc: Blocks,
  selectedModels: DraftModel[] | Promise<DraftModel[]>,
  docTitle?: string
) {
  const models = await selectedModels;
  const slice = std.clipboard.sliceToSnapshot(Slice.fromModels(doc, models));
  if (!slice) {
    return;
  }
  const firstBlock = models[0];
  if (!firstBlock) {
    return;
  }
  // if title undefined, use the first heading block content as doc title
  const title = docTitle || getTitleFromSelectedModels(models);
  const linkedDoc = createLinkedDocFromSlice(std, doc, slice.content, title);
  // insert linked doc card
  doc.addSiblingBlocks(
    doc.getBlock(firstBlock.id)!.model,
    [
      {
        flavour: 'affine:embed-linked-doc',
        pageId: linkedDoc.id,
      },
    ],
    'before'
  );
  // delete selected elements
  models.forEach(model => doc.deleteBlock(model));
  return linkedDoc;
}

export function createLinkedDocFromSlice(
  std: BlockStdScope,
  doc: Blocks,
  snapshots: BlockSnapshot[],
  docTitle?: string
) {
  // const modelsWithChildren = (list:BlockModel[]):BlockModel[]=>list.flatMap(model=>[model,...modelsWithChildren(model.children)])
  const linkedDoc = doc.workspace.createDoc({});
  linkedDoc.load(() => {
    const rootId = linkedDoc.addBlock('affine:page', {
      title: new Text(docTitle),
    });
    linkedDoc.addBlock('affine:surface', {}, rootId);
    const noteId = linkedDoc.addBlock('affine:note', {}, rootId);
    snapshots.forEach(snapshot => {
      std.clipboard
        .pasteBlockSnapshot(snapshot, linkedDoc, noteId)
        .catch(console.error);
    });
  });
  return linkedDoc;
}
