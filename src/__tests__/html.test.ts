import { describe, it, expect } from 'vitest';
import { convertHtmlToMarkdown, extractHtmlMetadata } from '../converters/html';

describe('convertHtmlToMarkdown', () => {
  describe('headings', () => {
    it('converts h1', () => {
      const { markdown } = convertHtmlToMarkdown('<h1>Title</h1>');
      expect(markdown).toContain('# Title');
    });

    it('converts h2', () => {
      const { markdown } = convertHtmlToMarkdown('<h2>Section</h2>');
      expect(markdown).toContain('## Section');
    });

    it('converts h3', () => {
      const { markdown } = convertHtmlToMarkdown('<h3>Subsection</h3>');
      expect(markdown).toContain('### Subsection');
    });

    it('converts h4', () => {
      const { markdown } = convertHtmlToMarkdown('<h4>Sub-subsection</h4>');
      expect(markdown).toContain('#### Sub-subsection');
    });

    it('converts h5', () => {
      const { markdown } = convertHtmlToMarkdown('<h5>Detail</h5>');
      expect(markdown).toContain('##### Detail');
    });

    it('converts h6', () => {
      const { markdown } = convertHtmlToMarkdown('<h6>Minor</h6>');
      expect(markdown).toContain('###### Minor');
    });

    it('handles heading with inline formatting', () => {
      const { markdown } = convertHtmlToMarkdown('<h2>Section <strong>Bold</strong></h2>');
      expect(markdown).toContain('## Section **Bold**');
    });

    it('handles multiple headings', () => {
      const html = '<h1>Title</h1><h2>Section</h2><h3>Sub</h3>';
      const { markdown } = convertHtmlToMarkdown(html);
      expect(markdown).toContain('# Title');
      expect(markdown).toContain('## Section');
      expect(markdown).toContain('### Sub');
    });
  });

  describe('paragraphs', () => {
    it('converts simple paragraph', () => {
      const { markdown } = convertHtmlToMarkdown('<p>Hello world</p>');
      expect(markdown.trim()).toBe('Hello world');
    });

    it('converts multiple paragraphs', () => {
      const { markdown } = convertHtmlToMarkdown('<p>First</p><p>Second</p>');
      expect(markdown).toContain('First');
      expect(markdown).toContain('Second');
    });

    it('handles empty paragraphs', () => {
      const { markdown } = convertHtmlToMarkdown('<p></p><p>Content</p>');
      expect(markdown.trim()).toBe('Content');
    });
  });

  describe('inline formatting', () => {
    it('converts bold (strong)', () => {
      const { markdown } = convertHtmlToMarkdown('<p><strong>bold text</strong></p>');
      expect(markdown).toContain('**bold text**');
    });

    it('converts bold (b)', () => {
      const { markdown } = convertHtmlToMarkdown('<p><b>bold text</b></p>');
      expect(markdown).toContain('**bold text**');
    });

    it('converts italic (em)', () => {
      const { markdown } = convertHtmlToMarkdown('<p><em>italic text</em></p>');
      expect(markdown).toContain('*italic text*');
    });

    it('converts italic (i)', () => {
      const { markdown } = convertHtmlToMarkdown('<p><i>italic text</i></p>');
      expect(markdown).toContain('*italic text*');
    });

    it('converts strikethrough (del)', () => {
      const { markdown } = convertHtmlToMarkdown('<p><del>deleted</del></p>');
      expect(markdown).toContain('~~deleted~~');
    });

    it('converts strikethrough (s)', () => {
      const { markdown } = convertHtmlToMarkdown('<p><s>struck</s></p>');
      expect(markdown).toContain('~~struck~~');
    });

    it('converts inline code', () => {
      const { markdown } = convertHtmlToMarkdown('<p>Use <code>npm install</code></p>');
      expect(markdown).toContain('`npm install`');
    });

    it('converts superscript', () => {
      const { markdown } = convertHtmlToMarkdown('<p>E=mc<sup>2</sup></p>');
      expect(markdown).toContain('<sup>2</sup>');
    });

    it('converts subscript', () => {
      const { markdown } = convertHtmlToMarkdown('<p>H<sub>2</sub>O</p>');
      expect(markdown).toContain('<sub>2</sub>');
    });

    it('handles mixed inline formatting', () => {
      const { markdown } = convertHtmlToMarkdown('<p>This is <strong>bold</strong> and <em>italic</em></p>');
      expect(markdown).toContain('**bold**');
      expect(markdown).toContain('*italic*');
    });
  });

  describe('links', () => {
    it('converts basic link', () => {
      const { markdown } = convertHtmlToMarkdown('<p><a href="https://example.com">Example</a></p>');
      expect(markdown).toContain('[Example](https://example.com)');
    });

    it('handles link with no href', () => {
      const { markdown } = convertHtmlToMarkdown('<p><a>Just text</a></p>');
      expect(markdown).toContain('Just text');
      expect(markdown).not.toContain('[');
    });

    it('handles link with empty text', () => {
      const { markdown } = convertHtmlToMarkdown('<p><a href="https://example.com"></a></p>');
      expect(markdown.trim()).toBe('');
    });

    it('handles link with nested formatting', () => {
      const { markdown } = convertHtmlToMarkdown('<p><a href="url"><strong>Bold Link</strong></a></p>');
      expect(markdown).toContain('[**Bold Link**](url)');
    });
  });

  describe('images', () => {
    it('converts basic image', () => {
      const { markdown, images } = convertHtmlToMarkdown('<img src="photo.jpg" alt="A photo">');
      expect(markdown).toContain('![A photo](photo.jpg)');
      expect(images).toHaveLength(1);
      expect(images[0].src).toBe('photo.jpg');
      expect(images[0].alt).toBe('A photo');
    });

    it('handles image with no alt', () => {
      const { markdown } = convertHtmlToMarkdown('<img src="photo.jpg">');
      expect(markdown).toContain('![](photo.jpg)');
    });

    it('handles image with no src', () => {
      const { markdown } = convertHtmlToMarkdown('<img alt="missing">');
      expect(markdown).toContain('![missing]()');
    });

    it('extracts multiple images', () => {
      const { images } = convertHtmlToMarkdown('<img src="a.jpg" alt="A"><img src="b.jpg" alt="B">');
      expect(images).toHaveLength(2);
      expect(images[0].id).toBe('img-1');
      expect(images[1].id).toBe('img-2');
    });
  });

  describe('lists', () => {
    it('converts unordered list', () => {
      const { markdown } = convertHtmlToMarkdown('<ul><li>First</li><li>Second</li><li>Third</li></ul>');
      expect(markdown).toContain('- First');
      expect(markdown).toContain('- Second');
      expect(markdown).toContain('- Third');
    });

    it('converts ordered list', () => {
      const { markdown } = convertHtmlToMarkdown('<ol><li>First</li><li>Second</li><li>Third</li></ol>');
      expect(markdown).toContain('1. First');
      expect(markdown).toContain('2. Second');
      expect(markdown).toContain('3. Third');
    });

    it('converts nested unordered list', () => {
      const html = '<ul><li>Outer<ul><li>Inner</li></ul></li></ul>';
      const { markdown } = convertHtmlToMarkdown(html);
      expect(markdown).toContain('- Outer');
      expect(markdown).toContain('  - Inner');
    });

    it('converts nested ordered list', () => {
      const html = '<ol><li>Outer<ol><li>Inner</li></ol></li></ol>';
      const { markdown } = convertHtmlToMarkdown(html);
      expect(markdown).toContain('1. Outer');
      expect(markdown).toContain('  1. Inner');
    });

    it('converts mixed nested lists', () => {
      const html = '<ul><li>Item<ol><li>Numbered</li></ol></li></ul>';
      const { markdown } = convertHtmlToMarkdown(html);
      expect(markdown).toContain('- Item');
      expect(markdown).toContain('  1. Numbered');
    });

    it('handles list items with inline formatting', () => {
      const { markdown } = convertHtmlToMarkdown('<ul><li><strong>Bold</strong> item</li></ul>');
      expect(markdown).toContain('- **Bold** item');
    });

    it('handles deeply nested lists', () => {
      const html = '<ul><li>L1<ul><li>L2<ul><li>L3</li></ul></li></ul></li></ul>';
      const { markdown } = convertHtmlToMarkdown(html);
      expect(markdown).toContain('- L1');
      expect(markdown).toContain('  - L2');
      expect(markdown).toContain('    - L3');
    });
  });

  describe('tables', () => {
    it('converts basic table with header', () => {
      const html = `
        <table>
          <thead><tr><th>Name</th><th>Age</th></tr></thead>
          <tbody><tr><td>Alice</td><td>30</td></tr></tbody>
        </table>
      `;
      const { markdown } = convertHtmlToMarkdown(html);
      expect(markdown).toContain('| Name | Age |');
      expect(markdown).toContain('| --- | --- |');
      expect(markdown).toContain('| Alice | 30 |');
    });

    it('converts table without thead', () => {
      const html = '<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>';
      const { markdown } = convertHtmlToMarkdown(html);
      expect(markdown).toContain('| A | B |');
      expect(markdown).toContain('| --- | --- |');
      expect(markdown).toContain('| C | D |');
    });

    it('normalizes uneven column counts', () => {
      const html = '<table><tr><td>A</td><td>B</td><td>C</td></tr><tr><td>D</td><td>E</td></tr></table>';
      const { markdown } = convertHtmlToMarkdown(html);
      // Second row should be padded to 3 columns
      const lines = markdown.split('\n').filter(l => l.includes('|'));
      for (const line of lines) {
        if (line.includes('---')) continue;
        const cells = line.split('|').filter(Boolean);
        expect(cells.length).toBe(3);
      }
    });

    it('escapes pipe characters in cells', () => {
      const html = '<table><tr><td>A|B</td><td>C</td></tr></table>';
      const { markdown } = convertHtmlToMarkdown(html);
      expect(markdown).toContain('A\\|B');
    });

    it('handles table with th in body', () => {
      const html = '<table><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Data 1</td><td>Data 2</td></tr></table>';
      const { markdown } = convertHtmlToMarkdown(html);
      expect(markdown).toContain('| Header 1 | Header 2 |');
      expect(markdown).toContain('| --- | --- |');
      expect(markdown).toContain('| Data 1 | Data 2 |');
    });

    it('handles empty table', () => {
      const html = '<table></table>';
      const { markdown } = convertHtmlToMarkdown(html);
      // Empty table should produce nothing meaningful
      expect(markdown.trim()).toBe('');
    });

    it('handles table with inline formatting in cells', () => {
      const html = '<table><tr><td><strong>Bold</strong></td><td><em>Italic</em></td></tr></table>';
      const { markdown } = convertHtmlToMarkdown(html);
      expect(markdown).toContain('**Bold**');
      expect(markdown).toContain('*Italic*');
    });
  });

  describe('code blocks', () => {
    it('converts pre/code block', () => {
      const { markdown } = convertHtmlToMarkdown('<pre><code>const x = 1;</code></pre>');
      expect(markdown).toContain('```');
      expect(markdown).toContain('const x = 1;');
    });

    it('preserves language hint', () => {
      const { markdown } = convertHtmlToMarkdown('<pre><code class="language-javascript">const x = 1;</code></pre>');
      expect(markdown).toContain('```javascript');
    });

    it('handles pre without code', () => {
      const { markdown } = convertHtmlToMarkdown('<pre>preformatted text</pre>');
      expect(markdown).toContain('```');
      expect(markdown).toContain('preformatted text');
    });

    it('handles lang- class prefix', () => {
      const { markdown } = convertHtmlToMarkdown('<pre><code class="lang-python">print("hi")</code></pre>');
      expect(markdown).toContain('```python');
    });
  });

  describe('blockquotes', () => {
    it('converts simple blockquote', () => {
      const { markdown } = convertHtmlToMarkdown('<blockquote><p>A quote</p></blockquote>');
      expect(markdown).toContain('> A quote');
    });

    it('handles multi-line blockquote', () => {
      const { markdown } = convertHtmlToMarkdown('<blockquote><p>Line 1</p><p>Line 2</p></blockquote>');
      const lines = markdown.split('\n').filter(l => l.startsWith('>'));
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('horizontal rules', () => {
    it('converts hr tag', () => {
      const { markdown } = convertHtmlToMarkdown('<p>Before</p><hr><p>After</p>');
      expect(markdown).toContain('---');
    });

    it('handles self-closing hr', () => {
      const { markdown } = convertHtmlToMarkdown('<p>Before</p><hr/><p>After</p>');
      expect(markdown).toContain('---');
    });
  });

  describe('structure stripping', () => {
    it('strips script tags', () => {
      const { markdown } = convertHtmlToMarkdown('<p>Text</p><script>alert("xss")</script>');
      expect(markdown).not.toContain('alert');
      expect(markdown).not.toContain('script');
      expect(markdown).toContain('Text');
    });

    it('strips style tags', () => {
      const { markdown } = convertHtmlToMarkdown('<style>body { color: red; }</style><p>Text</p>');
      expect(markdown).not.toContain('color');
      expect(markdown).toContain('Text');
    });

    it('strips nav elements', () => {
      const { markdown } = convertHtmlToMarkdown('<nav><a href="/">Home</a></nav><p>Content</p>');
      expect(markdown).not.toContain('Home');
      expect(markdown).toContain('Content');
    });

    it('strips footer elements', () => {
      const { markdown } = convertHtmlToMarkdown('<p>Content</p><footer>Copyright 2024</footer>');
      expect(markdown).not.toContain('Copyright');
      expect(markdown).toContain('Content');
    });

    it('strips header elements', () => {
      const { markdown } = convertHtmlToMarkdown('<header>Site Header</header><p>Content</p>');
      expect(markdown).not.toContain('Site Header');
      expect(markdown).toContain('Content');
    });

    it('strips aside elements', () => {
      const { markdown } = convertHtmlToMarkdown('<aside>Sidebar</aside><p>Content</p>');
      expect(markdown).not.toContain('Sidebar');
      expect(markdown).toContain('Content');
    });

    it('strips noscript elements', () => {
      const { markdown } = convertHtmlToMarkdown('<noscript>Enable JS</noscript><p>Content</p>');
      expect(markdown).not.toContain('Enable JS');
    });

    it('strips iframe elements', () => {
      const { markdown } = convertHtmlToMarkdown('<iframe src="https://example.com"></iframe><p>Content</p>');
      expect(markdown).not.toContain('iframe');
    });
  });

  describe('HTML entities', () => {
    it('decodes &amp;', () => {
      const { markdown } = convertHtmlToMarkdown('<p>A &amp; B</p>');
      expect(markdown).toContain('A & B');
    });

    it('decodes &lt; and &gt;', () => {
      const { markdown } = convertHtmlToMarkdown('<p>&lt;div&gt;</p>');
      expect(markdown).toContain('<div>');
    });

    it('decodes &quot;', () => {
      const { markdown } = convertHtmlToMarkdown('<p>&quot;quoted&quot;</p>');
      expect(markdown).toContain('"quoted"');
    });

    it('decodes &nbsp;', () => {
      const { markdown } = convertHtmlToMarkdown('<p>hello&nbsp;world</p>');
      expect(markdown).toContain('hello world');
    });

    it('decodes numeric entities', () => {
      const { markdown } = convertHtmlToMarkdown('<p>&#169; 2024</p>');
      expect(markdown).toContain('\u00A9 2024');
    });

    it('decodes hex entities', () => {
      const { markdown } = convertHtmlToMarkdown('<p>&#x2764;</p>');
      expect(markdown).toContain('\u2764');
    });
  });

  describe('complex structures', () => {
    it('converts a full HTML document', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test Doc</title></head>
        <body>
          <h1>Document Title</h1>
          <p>Introduction paragraph.</p>
          <h2>Section One</h2>
          <p>Some <strong>bold</strong> and <em>italic</em> text.</p>
          <ul>
            <li>Item A</li>
            <li>Item B</li>
          </ul>
          <h2>Section Two</h2>
          <pre><code class="language-js">console.log("hello");</code></pre>
        </body>
        </html>
      `;
      const { markdown } = convertHtmlToMarkdown(html);
      expect(markdown).toContain('# Document Title');
      expect(markdown).toContain('Introduction paragraph.');
      expect(markdown).toContain('## Section One');
      expect(markdown).toContain('**bold**');
      expect(markdown).toContain('*italic*');
      expect(markdown).toContain('- Item A');
      expect(markdown).toContain('- Item B');
      expect(markdown).toContain('## Section Two');
      expect(markdown).toContain('```js');
      expect(markdown).toContain('console.log("hello");');
    });

    it('handles figure with figcaption', () => {
      const html = '<figure><img src="photo.jpg" alt="Photo"><figcaption>A nice photo</figcaption></figure>';
      const { markdown } = convertHtmlToMarkdown(html);
      expect(markdown).toContain('![Photo](photo.jpg)');
      expect(markdown).toContain('*A nice photo*');
    });

    it('unwraps div and span elements', () => {
      const { markdown } = convertHtmlToMarkdown('<div><span>Inner text</span></div>');
      expect(markdown).toContain('Inner text');
      expect(markdown).not.toContain('div');
      expect(markdown).not.toContain('span');
    });

    it('handles br tags', () => {
      const { markdown } = convertHtmlToMarkdown('<p>Line 1<br>Line 2</p>');
      expect(markdown).toContain('Line 1');
      expect(markdown).toContain('Line 2');
    });
  });

  describe('whitespace cleanup', () => {
    it('collapses multiple blank lines', () => {
      const html = '<p>A</p>\n\n\n\n<p>B</p>';
      const { markdown } = convertHtmlToMarkdown(html);
      // Should not have more than 2 consecutive newlines
      expect(markdown).not.toMatch(/\n{3,}/);
    });

    it('removes leading blank lines', () => {
      const { markdown } = convertHtmlToMarkdown('\n\n<p>Content</p>');
      expect(markdown).not.toMatch(/^\n/);
    });

    it('ensures trailing newline', () => {
      const { markdown } = convertHtmlToMarkdown('<p>Content</p>');
      expect(markdown).toMatch(/\n$/);
    });

    it('removes trailing whitespace from lines', () => {
      const { markdown } = convertHtmlToMarkdown('<p>Text   </p>');
      const lines = markdown.split('\n');
      for (const line of lines) {
        expect(line).toBe(line.trimEnd());
      }
    });
  });
});

describe('extractHtmlMetadata', () => {
  it('extracts title from <title> tag', () => {
    const meta = extractHtmlMetadata('<head><title>My Document</title></head>');
    expect(meta.title).toBe('My Document');
  });

  it('extracts author from meta tag', () => {
    const meta = extractHtmlMetadata('<head><meta name="author" content="John Doe"></head>');
    expect(meta.author).toBe('John Doe');
  });

  it('extracts date from meta tag', () => {
    const meta = extractHtmlMetadata('<head><meta name="date" content="2024-01-15"></head>');
    expect(meta.date).toBe('2024-01-15');
  });

  it('extracts og:title as fallback', () => {
    const meta = extractHtmlMetadata('<head><meta property="og:title" content="OG Title"></head>');
    expect(meta.title).toBe('OG Title');
  });

  it('prefers <title> over og:title', () => {
    const meta = extractHtmlMetadata('<head><title>Primary</title><meta property="og:title" content="OG"></head>');
    expect(meta.title).toBe('Primary');
  });

  it('returns empty object for no metadata', () => {
    const meta = extractHtmlMetadata('<body><p>No metadata</p></body>');
    expect(meta.title).toBeUndefined();
    expect(meta.author).toBeUndefined();
    expect(meta.date).toBeUndefined();
  });

  it('handles multiple meta tags', () => {
    const html = `
      <head>
        <title>Title</title>
        <meta name="author" content="Author">
        <meta name="date" content="2024-01-01">
      </head>
    `;
    const meta = extractHtmlMetadata(html);
    expect(meta.title).toBe('Title');
    expect(meta.author).toBe('Author');
    expect(meta.date).toBe('2024-01-01');
  });
});

describe('bug fix tests', () => {
  it('handles Unicode code points above U+FFFF (emoji)', () => {
    const { markdown } = convertHtmlToMarkdown('<p>&#x1F600; smile</p>');
    expect(markdown).toContain('\u{1F600}');
  });

  it('tracks images inside inline elements (paragraphs)', () => {
    const { markdown, images } = convertHtmlToMarkdown('<p>Text <img src="pic.png" alt="photo"> more</p>');
    expect(markdown).toContain('![photo](pic.png)');
    expect(images).toHaveLength(1);
    expect(images[0].src).toBe('pic.png');
  });

  it('tracks images inside table cells', () => {
    const { images } = convertHtmlToMarkdown('<table><tr><td><img src="cell.png" alt="cell"></td></tr></table>');
    expect(images).toHaveLength(1);
    expect(images[0].src).toBe('cell.png');
  });

  it('tracks images inside list items', () => {
    const { images } = convertHtmlToMarkdown('<ul><li><img src="li.png" alt="item"></li></ul>');
    expect(images).toHaveLength(1);
    expect(images[0].src).toBe('li.png');
  });

  it('strips head and title content from markdown output', () => {
    const { markdown } = convertHtmlToMarkdown('<html><head><title>Page Title</title></head><body><p>Body</p></body></html>');
    expect(markdown).not.toContain('Page Title');
    expect(markdown).toContain('Body');
  });

  it('strips head content when no body tag present', () => {
    const { markdown } = convertHtmlToMarkdown('<head><title>No Body</title></head><p>Content</p>');
    expect(markdown).not.toContain('No Body');
    expect(markdown).toContain('Content');
  });
});
