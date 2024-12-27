import { AttachmentBlockNotionHtmlAdapterExtension } from '@blocksuite/affine-block-attachment';
import { BookmarkBlockNotionHtmlAdapterExtension } from '@blocksuite/affine-block-bookmark';
import { DividerBlockNotionHtmlAdapterExtension } from '@blocksuite/affine-block-divider';
import {
  EmbedFigmaBlockNotionHtmlAdapterExtension,
  EmbedGithubBlockNotionHtmlAdapterExtension,
  EmbedLoomBlockNotionHtmlAdapterExtension,
  EmbedYoutubeBlockNotionHtmlAdapterExtension,
} from '@blocksuite/affine-block-embed';
import { ImageBlockNotionHtmlAdapterExtension } from '@blocksuite/affine-block-image';
import { LatexBlockNotionHtmlAdapterExtension } from '@blocksuite/affine-block-latex';
import { ListBlockNotionHtmlAdapterExtension } from '@blocksuite/affine-block-list';
import { ParagraphBlockNotionHtmlAdapterExtension } from '@blocksuite/affine-block-paragraph';
import type { ExtensionType } from '@blocksuite/block-std';

import { CodeBlockNotionHtmlAdapterExtension } from '../../../code-block/adapters/notion-html.js';
import { DatabaseBlockNotionHtmlAdapterExtension } from '../../../database-block/adapters/notion-html.js';
import { RootBlockNotionHtmlAdapterExtension } from '../../../root-block/adapters/notion-html.js';

export const defaultBlockNotionHtmlAdapterMatchers: ExtensionType[] = [
  ListBlockNotionHtmlAdapterExtension,
  ParagraphBlockNotionHtmlAdapterExtension,
  CodeBlockNotionHtmlAdapterExtension,
  DividerBlockNotionHtmlAdapterExtension,
  ImageBlockNotionHtmlAdapterExtension,
  RootBlockNotionHtmlAdapterExtension,
  BookmarkBlockNotionHtmlAdapterExtension,
  DatabaseBlockNotionHtmlAdapterExtension,
  LatexBlockNotionHtmlAdapterExtension,
  EmbedYoutubeBlockNotionHtmlAdapterExtension,
  EmbedFigmaBlockNotionHtmlAdapterExtension,
  EmbedGithubBlockNotionHtmlAdapterExtension,
  EmbedLoomBlockNotionHtmlAdapterExtension,
  AttachmentBlockNotionHtmlAdapterExtension,
];
