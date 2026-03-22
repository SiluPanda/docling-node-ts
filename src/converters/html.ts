import { ImageReference } from '../types';

/**
 * Self-closing/void HTML elements that should not have closing tags.
 */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Elements to strip entirely (tag and content).
 */
const STRIP_ELEMENTS = new Set([
  'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
  'nav', 'footer', 'header', 'aside',
]);

/**
 * A minimal HTML node representation for our parser.
 */
interface HtmlNode {
  type: 'element' | 'text' | 'comment';
  tag?: string;
  attrs?: Record<string, string>;
  children?: HtmlNode[];
  text?: string;
}

/**
 * Parse an HTML string into a tree of HtmlNode objects.
 * This is a minimal parser - not a full spec-compliant HTML parser,
 * but handles the common cases needed for document conversion.
 */
function parseHtml(html: string): HtmlNode[] {
  const nodes: HtmlNode[] = [];
  let pos = 0;

  function readUntil(stop: string): string {
    const idx = html.indexOf(stop, pos);
    if (idx === -1) {
      const result = html.slice(pos);
      pos = html.length;
      return result;
    }
    const result = html.slice(pos, idx);
    pos = idx;
    return result;
  }

  function skipWhitespace(): void {
    while (pos < html.length && /\s/.test(html[pos])) pos++;
  }

  function readAttrValue(): string {
    skipWhitespace();
    if (pos >= html.length || html[pos] !== '=') return '';
    pos++; // skip =
    skipWhitespace();
    if (pos >= html.length) return '';

    if (html[pos] === '"') {
      pos++;
      const val = readUntil('"');
      pos++; // skip closing quote
      return decodeHtmlEntities(val);
    } else if (html[pos] === "'") {
      pos++;
      const val = readUntil("'");
      pos++; // skip closing quote
      return decodeHtmlEntities(val);
    } else {
      // Unquoted attribute value
      let val = '';
      while (pos < html.length && !/[\s>]/.test(html[pos])) {
        val += html[pos];
        pos++;
      }
      return decodeHtmlEntities(val);
    }
  }

  function readAttrs(): Record<string, string> {
    const attrs: Record<string, string> = {};
    while (pos < html.length && html[pos] !== '>' && !(html[pos] === '/' && pos + 1 < html.length && html[pos + 1] === '>')) {
      skipWhitespace();
      if (pos >= html.length || html[pos] === '>' || (html[pos] === '/' && pos + 1 < html.length && html[pos + 1] === '>')) break;

      // Read attribute name
      let name = '';
      while (pos < html.length && !/[\s=>/]/.test(html[pos])) {
        name += html[pos];
        pos++;
      }
      if (!name) { pos++; continue; }
      name = name.toLowerCase();

      skipWhitespace();
      if (pos < html.length && html[pos] === '=') {
        attrs[name] = readAttrValue();
      } else {
        attrs[name] = '';
      }
    }
    return attrs;
  }

  function parse(): HtmlNode[] {
    const result: HtmlNode[] = [];

    while (pos < html.length) {
      if (html[pos] === '<') {
        // Check for comment
        if (html.slice(pos, pos + 4) === '<!--') {
          pos += 4;
          const commentEnd = html.indexOf('-->', pos);
          if (commentEnd === -1) {
            pos = html.length;
          } else {
            pos = commentEnd + 3;
          }
          continue;
        }

        // Check for DOCTYPE
        if (html.slice(pos, pos + 9).toLowerCase() === '<!doctype') {
          readUntil('>');
          pos++; // skip >
          continue;
        }

        // Check for CDATA
        if (html.slice(pos, pos + 9) === '<![CDATA[') {
          pos += 9;
          const cdataEnd = html.indexOf(']]>', pos);
          if (cdataEnd === -1) {
            pos = html.length;
          } else {
            const text = html.slice(pos, cdataEnd);
            result.push({ type: 'text', text });
            pos = cdataEnd + 3;
          }
          continue;
        }

        // Check for closing tag
        if (pos + 1 < html.length && html[pos + 1] === '/') {
          pos += 2;
          readUntil('>');
          pos++; // skip >
          return result; // Return to parent
        }

        // Opening tag
        pos++; // skip <
        let tag = '';
        while (pos < html.length && !/[\s/>]/.test(html[pos])) {
          tag += html[pos];
          pos++;
        }
        tag = tag.toLowerCase();

        if (!tag) continue;

        skipWhitespace();
        const attrs = readAttrs();

        // Check for self-closing
        let selfClosing = false;
        if (pos < html.length && html[pos] === '/') {
          selfClosing = true;
          pos++;
        }
        if (pos < html.length && html[pos] === '>') pos++;

        const node: HtmlNode = { type: 'element', tag, attrs, children: [] };

        if (VOID_ELEMENTS.has(tag) || selfClosing) {
          result.push(node);
          continue;
        }

        // For script/style tags, read raw content until closing tag
        if (tag === 'script' || tag === 'style') {
          const endTag = `</${tag}>`;
          const endIdx = html.toLowerCase().indexOf(endTag, pos);
          if (endIdx !== -1) {
            pos = endIdx + endTag.length;
          } else {
            pos = html.length;
          }
          // Don't add stripped elements
          if (STRIP_ELEMENTS.has(tag)) continue;
          result.push(node);
          continue;
        }

        // Parse children
        node.children = parse();
        result.push(node);
      } else {
        // Text node
        const text = readUntil('<');
        if (text) {
          result.push({ type: 'text', text: decodeHtmlEntities(text) });
        }
      }
    }

    return result;
  }

  return parse();
}

/**
 * Decode common HTML entities.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&bull;/g, '\u2022')
    .replace(/&copy;/g, '\u00A9')
    .replace(/&reg;/g, '\u00AE')
    .replace(/&trade;/g, '\u2122')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

/**
 * Find a node by tag name in the tree.
 */
function findNode(nodes: HtmlNode[], tag: string): HtmlNode | null {
  for (const node of nodes) {
    if (node.type === 'element' && node.tag === tag) return node;
    if (node.children) {
      const found = findNode(node.children, tag);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find all nodes matching a predicate.
 */
function findAll(nodes: HtmlNode[], predicate: (node: HtmlNode) => boolean): HtmlNode[] {
  const result: HtmlNode[] = [];
  for (const node of nodes) {
    if (predicate(node)) result.push(node);
    if (node.children) {
      result.push(...findAll(node.children, predicate));
    }
  }
  return result;
}

/**
 * Extract metadata from HTML head element.
 */
export function extractHtmlMetadata(html: string): {
  title?: string;
  author?: string;
  date?: string;
} {
  const nodes = parseHtml(html);
  const head = findNode(nodes, 'head');
  const meta: { title?: string; author?: string; date?: string } = {};

  if (!head) {
    // Try to find title in body
    const titleNode = findNode(nodes, 'title');
    if (titleNode) {
      meta.title = getTextContent(titleNode).trim();
    }
    return meta;
  }

  // Extract title
  const titleNode = findNode(head.children || [], 'title');
  if (titleNode) {
    meta.title = getTextContent(titleNode).trim();
  }

  // Extract meta tags
  const metaTags = findAll(head.children || [], (n) =>
    n.type === 'element' && n.tag === 'meta'
  );

  for (const metaTag of metaTags) {
    const name = (metaTag.attrs?.name || metaTag.attrs?.property || '').toLowerCase();
    const content = metaTag.attrs?.content || '';

    if (name === 'author') meta.author = content;
    if (name === 'date') meta.date = content;
    if (!meta.title && name === 'og:title') meta.title = content;
    if (!meta.author && name === 'article:author') meta.author = content;
    if (!meta.date && name === 'article:published_time') meta.date = content;
  }

  return meta;
}

/**
 * Get the text content of a node (recursive).
 */
function getTextContent(node: HtmlNode): string {
  if (node.type === 'text') return node.text || '';
  if (!node.children) return '';
  return node.children.map(getTextContent).join('');
}

/**
 * Check if a node should be stripped (removed entirely).
 */
function shouldStrip(node: HtmlNode): boolean {
  if (node.type !== 'element') return false;
  if (STRIP_ELEMENTS.has(node.tag || '')) return true;
  return false;
}

/**
 * Convert an HTML table element to a GFM markdown table.
 */
function convertTable(node: HtmlNode): string {
  const rows: string[][] = [];
  let hasHeader = false;

  function extractRows(parent: HtmlNode, isHeader: boolean): void {
    if (!parent.children) return;
    for (const child of parent.children) {
      if (child.type !== 'element') continue;
      if (child.tag === 'thead') {
        extractRows(child, true);
      } else if (child.tag === 'tbody' || child.tag === 'tfoot') {
        extractRows(child, false);
      } else if (child.tag === 'tr') {
        const cells: string[] = [];
        let rowIsHeader = isHeader;
        if (child.children) {
          for (const cell of child.children) {
            if (cell.type !== 'element') continue;
            if (cell.tag === 'th') {
              rowIsHeader = true;
              cells.push(convertInline(cell).trim());
            } else if (cell.tag === 'td') {
              cells.push(convertInline(cell).trim());
            }
          }
        }
        if (cells.length > 0) {
          if (rowIsHeader && rows.length === 0) {
            hasHeader = true;
          }
          rows.push(cells);
        }
      }
    }
  }

  extractRows(node, false);

  if (rows.length === 0) return '';

  // Normalize column count
  const maxCols = Math.max(...rows.map(r => r.length));
  for (const row of rows) {
    while (row.length < maxCols) row.push('');
  }

  // Escape pipes in cell content
  const escaped = rows.map(row =>
    row.map(cell => cell.replace(/\|/g, '\\|'))
  );

  const lines: string[] = [];

  if (!hasHeader) {
    // Create a synthetic header row from first row
    const headerRow = escaped[0];
    lines.push('| ' + headerRow.join(' | ') + ' |');
    lines.push('| ' + headerRow.map(() => '---').join(' | ') + ' |');
    for (let i = 1; i < escaped.length; i++) {
      lines.push('| ' + escaped[i].join(' | ') + ' |');
    }
  } else {
    // First row is header
    lines.push('| ' + escaped[0].join(' | ') + ' |');
    lines.push('| ' + escaped[0].map(() => '---').join(' | ') + ' |');
    for (let i = 1; i < escaped.length; i++) {
      lines.push('| ' + escaped[i].join(' | ') + ' |');
    }
  }

  return lines.join('\n');
}

/**
 * Convert inline HTML content to markdown (handles bold, italic, code, links, etc.).
 */
function convertInline(node: HtmlNode): string {
  if (node.type === 'text') return node.text || '';
  if (node.type === 'comment') return '';
  if (shouldStrip(node)) return '';

  const tag = node.tag || '';

  if (tag === 'br') return '\n';

  const childContent = (node.children || []).map(convertInline).join('');

  switch (tag) {
    case 'strong':
    case 'b':
      return childContent ? `**${childContent}**` : '';
    case 'em':
    case 'i':
      return childContent ? `*${childContent}*` : '';
    case 'del':
    case 's':
    case 'strike':
      return childContent ? `~~${childContent}~~` : '';
    case 'code':
      return childContent ? `\`${childContent}\`` : '';
    case 'a': {
      const href = node.attrs?.href || '';
      if (!href || !childContent) return childContent;
      return `[${childContent}](${href})`;
    }
    case 'img': {
      const src = node.attrs?.src || '';
      const alt = node.attrs?.alt || '';
      return `![${alt}](${src})`;
    }
    case 'sup':
      return childContent ? `<sup>${childContent}</sup>` : '';
    case 'sub':
      return childContent ? `<sub>${childContent}</sub>` : '';
    default:
      return childContent;
  }
}

/**
 * Convert a list element (ul or ol) to markdown.
 */
function convertList(node: HtmlNode, indent: number = 0, ordered: boolean = false): string {
  if (!node.children) return '';
  const lines: string[] = [];
  let itemIndex = 1;

  for (const child of node.children) {
    if (child.type !== 'element' || child.tag !== 'li') continue;

    const prefix = ordered ? `${itemIndex}. ` : '- ';
    const indentStr = '  '.repeat(indent);

    // Separate inline content from nested lists
    const inlineContent: string[] = [];
    const nestedLists: string[] = [];

    if (child.children) {
      for (const liChild of child.children) {
        if (liChild.type === 'element' && (liChild.tag === 'ul' || liChild.tag === 'ol')) {
          nestedLists.push(convertList(liChild, indent + 1, liChild.tag === 'ol'));
        } else {
          inlineContent.push(convertInline(liChild));
        }
      }
    }

    const text = inlineContent.join('').trim();
    if (text) {
      lines.push(`${indentStr}${prefix}${text}`);
    }

    for (const nested of nestedLists) {
      lines.push(nested);
    }

    itemIndex++;
  }

  return lines.join('\n');
}

/**
 * Convert an HTML node tree to markdown (block-level conversion).
 */
function convertNode(node: HtmlNode, images: ImageReference[]): string {
  if (node.type === 'text') {
    return node.text || '';
  }
  if (node.type === 'comment') return '';
  if (shouldStrip(node)) return '';

  const tag = node.tag || '';

  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = parseInt(tag[1], 10);
      const text = convertInline({ type: 'element', tag: 'span', children: node.children }).trim();
      if (!text) return '';
      return `\n${'#'.repeat(level)} ${text}\n`;
    }

    case 'p': {
      const text = convertInline({ type: 'element', tag: 'span', children: node.children }).trim();
      if (!text) return '';
      return `\n${text}\n`;
    }

    case 'blockquote': {
      const content = convertChildren(node, images).trim();
      if (!content) return '';
      const lines = content.split('\n').map(line => `> ${line}`);
      return `\n${lines.join('\n')}\n`;
    }

    case 'pre': {
      // Check for <pre><code> pattern
      const codeChild = node.children?.find(
        c => c.type === 'element' && c.tag === 'code'
      );
      let code: string;
      let language = '';

      if (codeChild) {
        code = getTextContent(codeChild);
        // Extract language from class
        const className = codeChild.attrs?.class || '';
        const langMatch = className.match(/(?:language-|lang-)(\S+)/);
        if (langMatch) language = langMatch[1];
      } else {
        code = getTextContent(node);
      }

      return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
    }

    case 'code': {
      // Inline code that's not inside a <pre>
      const text = getTextContent(node);
      return text ? `\`${text}\`` : '';
    }

    case 'ul':
      return `\n${convertList(node, 0, false)}\n`;

    case 'ol':
      return `\n${convertList(node, 0, true)}\n`;

    case 'table':
      return `\n${convertTable(node)}\n`;

    case 'hr':
      return '\n---\n';

    case 'br':
      return '\n';

    case 'img': {
      const src = node.attrs?.src || '';
      const alt = node.attrs?.alt || '';
      if (src) {
        images.push({
          id: `img-${images.length + 1}`,
          alt,
          src,
        });
      }
      return `\n![${alt}](${src})\n`;
    }

    case 'a': {
      const href = node.attrs?.href || '';
      const text = convertInline({ type: 'element', tag: 'span', children: node.children }).trim();
      if (!href || !text) return text || '';
      return `[${text}](${href})`;
    }

    case 'figure': {
      const parts: string[] = [];
      if (node.children) {
        for (const child of node.children) {
          if (child.type === 'element' && child.tag === 'img') {
            parts.push(convertNode(child, images));
          } else if (child.type === 'element' && child.tag === 'figcaption') {
            const caption = convertInline(child).trim();
            if (caption) parts.push(`\n*${caption}*\n`);
          }
        }
      }
      return parts.join('');
    }

    case 'strong':
    case 'b':
    case 'em':
    case 'i':
    case 'del':
    case 's':
    case 'strike':
    case 'sup':
    case 'sub':
      return convertInline(node);

    // Structural elements that we unwrap
    case 'div':
    case 'span':
    case 'section':
    case 'article':
    case 'main':
    case 'body':
    case 'html':
    case 'head':
    case 'title':
    case 'form':
    case 'fieldset':
    case 'legend':
    case 'details':
    case 'summary':
    case 'dl':
    case 'dt':
    case 'dd':
    case 'address':
    case 'center':
      return convertChildren(node, images);

    default:
      return convertChildren(node, images);
  }
}

/**
 * Convert children of a node to markdown.
 */
function convertChildren(node: HtmlNode, images: ImageReference[]): string {
  if (!node.children) return '';
  return node.children.map(child => convertNode(child, images)).join('');
}

/**
 * Clean up the generated markdown output.
 */
function cleanMarkdown(md: string): string {
  let result = md;

  // Collapse multiple blank lines to at most two newlines
  result = result.replace(/\n{3,}/g, '\n\n');

  // Remove leading blank lines
  result = result.replace(/^\n+/, '');

  // Remove trailing whitespace from lines
  result = result.replace(/[ \t]+$/gm, '');

  // Ensure single trailing newline
  result = result.trimEnd() + '\n';

  return result;
}

/**
 * Convert HTML content to markdown.
 *
 * Handles:
 * - Headings (h1-h6)
 * - Paragraphs
 * - Bold, italic, strikethrough
 * - Links and images
 * - Ordered and unordered lists (including nested)
 * - Tables (GFM pipe tables)
 * - Code blocks (with language hints)
 * - Blockquotes
 * - Horizontal rules
 *
 * Strips script, style, nav, footer, header, aside elements.
 * Extracts metadata from <head> (title, meta tags).
 *
 * @param html - The HTML content to convert
 * @returns Object with markdown string and extracted images
 */
export function convertHtmlToMarkdown(html: string): {
  markdown: string;
  images: ImageReference[];
} {
  const images: ImageReference[] = [];
  const nodes = parseHtml(html);

  // Find the body, or use the whole tree
  const body = findNode(nodes, 'body');
  const contentNodes = body ? (body.children || []) : nodes;

  let markdown = '';
  for (const node of contentNodes) {
    markdown += convertNode(node, images);
  }

  return {
    markdown: cleanMarkdown(markdown),
    images,
  };
}
