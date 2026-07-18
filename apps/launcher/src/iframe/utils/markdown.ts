export function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseAttributes(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /(\w+)=&quot;([^&]*?)&quot;/g;
  let match;
  while ((match = regex.exec(attrStr)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function protectGeneratedAttribute(value: string) {
  return value.replace(/_/g, '&#95;').replace(/\*/g, '&#42;');
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeGeneratedDivAttributes(attrStr: string) {
  const attrs: string[] = [];
  const regex = /([a-zA-Z][\w:-]*)=&quot;([\s\S]*?)&quot;/g;
  let match;

  while ((match = regex.exec(attrStr)) !== null) {
    const name = match[1].toLowerCase();
    const value = normalizeHtmlEntities(match[2]);

    if (
      name !== 'class'
      && name !== 'style'
      && name !== 'role'
      && !name.startsWith('aria-')
      && !name.startsWith('data-')
    ) {
      continue;
    }

    if (
      name === 'style'
      && /(expression\s*\(|url\s*\(|javascript:|@import|behavior\s*:)/i.test(value)
    ) {
      continue;
    }

    attrs.push(`${name}="${escapeHtmlAttribute(value)}"`);
  }

  return attrs.length ? ` ${attrs.join(' ')}` : '';
}

function normalizeHtmlEntities(text: string) {
  return text
    .replace(/&amp;(lt|gt|quot|#34|#39|amp);/gi, '&$1;')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function renderInlineMarkdown(text: string) {
  return text
    .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__([\s\S]+?)__/g, '<strong>$1</strong>')
    .replace(/\*([^\n*]+?)\*/g, '<em>$1</em>')
    .replace(/_([^\n_]+?)_/g, '<em>$1</em>');
}

function stripStreamingMarkdownMarkers(text: string) {
  return text
    .replace(/(^|\n)([ \t]*)\* /g, '$1$2- ')
    .replace(/\*\*/g, '')
    .replace(/__/g, '');
}

function stripStreamingInteractiveMarkup(text: string) {
  if (!text) return "";

  const lowerText = text.toLowerCase();
  const marker = '<interaone-';
  const componentStart = lowerText.indexOf(marker);
  if (componentStart !== -1) {
    return text.slice(0, componentStart).trimEnd();
  }

  const lastOpeningBracket = lowerText.lastIndexOf('<');
  if (lastOpeningBracket !== -1) {
    const trailingText = lowerText.slice(lastOpeningBracket);
    if (marker.startsWith(trailingText)) {
      return text.slice(0, lastOpeningBracket).trimEnd();
    }
  }

  return text;
}

function stripHtmlLikeMarkup(
  text: string,
  preserveInteraOne = false,
  preserveDiv = false,
) {
  if (!text) return "";
  const preservedNames = [
    preserveInteraOne ? 'interaone-' : '',
    preserveDiv ? 'div\\b' : '',
  ].filter(Boolean).join('|');
  const preservedTagName = preservedNames ? `(?!${preservedNames})` : '';

  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\s*(thinking|thought)\s*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/&lt;\s*(thinking|thought)\s*&gt;[\s\S]*?&lt;\s*\/\s*\1\s*&gt;/gi, '')
    .replace(/<\s*(thinking|thought)\s*>[\s\S]*$/gi, '')
    .replace(/&lt;\s*(thinking|thought)\s*&gt;[\s\S]*$/gi, '')
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/&lt;\s*(script|style)[\s\S]*?&lt;\s*\/\s*\1\s*&gt;/gi, '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/&lt;\s*br\s*\/?\s*&gt;/gi, '\n')
    .replace(new RegExp(`<\\/?\\s*${preservedTagName}[a-z][a-z0-9:-]*(?:\\s+[^<>]*)?\\/?\\s*>`, 'gi'), '')
    .replace(new RegExp(`&lt;\\/?\\s*${preservedTagName}[a-z][a-z0-9:-]*(?:\\s+[^&]*)?\\/?\\s*&gt;`, 'gi'), '')
    .replace(new RegExp(`<[ \\t]*\\/?[ \\t]*${preservedTagName}[a-z][a-z0-9:-]*(?:[ \\t]+[^\\n<>]*)?$`, 'gim'), '')
    .replace(new RegExp(`&lt;[ \\t]*\\/?[ \\t]*${preservedTagName}[a-z][a-z0-9:-]*(?:[ \\t]+[^\\n&]*)?$`, 'gim'), '');
}

function stripHtmlLikeMarkupOutsideCode(
  text: string,
  preserveInteraOne = false,
  preserveDiv = false,
) {
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  return parts
    .map((part) => (
      part.startsWith('```') || part.startsWith('`')
        ? part
        : stripHtmlLikeMarkup(part, preserveInteraOne, preserveDiv)
    ))
    .join('');
}

export function stripMarkdown(text: string) {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`([^`]+)`/g, '$1') // remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove link URLs
    .replace(/[#*_-]/g, '') // remove formatting characters
    .replace(/\n+/g, ' ') // replace newlines with space
    .trim();
}

function renderInlineElements(text: string) {
  let s = escapeHtml(text);
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Links
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // Auto-link bare URLs
  s = s.replace(/(?<![="'(])https?:\/\/[^\s<>"')]+/g, function (url) {
    return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
  });
  // Bold + italic
  s = renderInlineMarkdown(s);
  return s;
}

export interface MarkdownBlock {
  type: 'paragraph' | 'heading' | 'list' | 'code_fence' | 'table' | 'component';
  content: string;
  lang?: string;
  isComplete: boolean;
}

export function scanStreamingMarkdownBlocks(text: string): MarkdownBlock[] {
  if (!text) return [];

  // Clean up initial HTML-like tags (thinking blocks etc)
  const cleanedText = stripHtmlLikeMarkupOutsideCode(normalizeHtmlEntities(text), true);

  const lines = cleanedText.split('\n');
  const blocks: MarkdownBlock[] = [];

  let insideCode = false;
  let codeLang = '';
  let codeBuffer: string[] = [];

  let insideComponent = false;
  let componentBuffer: string[] = [];
  let componentName = '';

  let insideTable = false;
  let tableBuffer: string[] = [];

  let currentBlockType: 'paragraph' | 'heading' | 'list' | null = null;
  let currentBuffer: string[] = [];

  function flushCurrentBlock() {
    if (currentBuffer.length === 0) return;
    const content = currentBuffer.join('\n');
    if (currentBlockType === 'heading') {
      blocks.push({ type: 'heading', content, isComplete: true });
    } else if (currentBlockType === 'list') {
      blocks.push({ type: 'list', content, isComplete: true });
    } else {
      blocks.push({ type: 'paragraph', content, isComplete: true });
    }
    currentBuffer = [];
    currentBlockType = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Fence Block parsing
    if (insideCode) {
      if (trimmed.startsWith('```')) {
        blocks.push({
          type: 'code_fence',
          content: codeBuffer.join('\n'),
          lang: codeLang,
          isComplete: true,
        });
        insideCode = false;
        codeBuffer = [];
        codeLang = '';
      } else {
        codeBuffer.push(line);
      }
      continue;
    }

    if (trimmed.startsWith('```')) {
      flushCurrentBlock();
      insideCode = true;
      codeLang = trimmed.slice(3).trim();
      codeBuffer = [];
      continue;
    }

    // 2. Custom Interactive Components parsing
    if (insideComponent) {
      componentBuffer.push(line);
      if (line.includes(`</interaone-${componentName}>`)) {
        blocks.push({
          type: 'component',
          content: componentBuffer.join('\n'),
          isComplete: true,
        });
        insideComponent = false;
        componentBuffer = [];
        componentName = '';
      }
      continue;
    }

    const componentMatch = line.match(/<(interaone-[a-z0-9:-]+)/i);
    if (componentMatch) {
      flushCurrentBlock();
      insideComponent = true;
      componentName = componentMatch[1].slice(10);
      componentBuffer = [line];
      if (line.includes(`</interaone-${componentName}>`)) {
        blocks.push({
          type: 'component',
          content: componentBuffer.join('\n'),
          isComplete: true,
        });
        insideComponent = false;
        componentBuffer = [];
        componentName = '';
      }
      continue;
    }

    // 3. Tables parsing
    if (insideTable) {
      if (line.includes('|')) {
        tableBuffer.push(line);
      } else {
        blocks.push({
          type: 'table',
          content: tableBuffer.join('\n'),
          isComplete: true,
        });
        insideTable = false;
        tableBuffer = [];
        i--; // re-evaluate this line outside table context
      }
      continue;
    }

    if (line.includes('|')) {
      const nextLine = lines[i + 1];
      if (nextLine && isTableSeparator(nextLine)) {
        flushCurrentBlock();
        insideTable = true;
        tableBuffer = [line];
        continue;
      }
    }

    // 4. Headings
    if (trimmed.startsWith('#')) {
      flushCurrentBlock();
      blocks.push({
        type: 'heading',
        content: line,
        isComplete: true,
      });
      continue;
    }

    // 5. Lists
    const isListItem = /^[ \t]*([-*+]|\d+\.)[ \t]+/.test(line);
    if (isListItem) {
      if (currentBlockType !== 'list') {
        flushCurrentBlock();
        currentBlockType = 'list';
      }
      currentBuffer.push(line);
      continue;
    }

    // 6. Blank lines
    if (trimmed === '') {
      flushCurrentBlock();
      continue;
    }

    // 7. Paragraph text accumulation
    if (currentBlockType !== 'paragraph' && currentBlockType !== null) {
      flushCurrentBlock();
    }
    currentBlockType = 'paragraph';
    currentBuffer.push(line);
  }

  flushCurrentBlock();

  // If there are unclosed streaming blocks, append them marked as incomplete
  if (insideCode) {
    blocks.push({
      type: 'code_fence',
      content: codeBuffer.join('\n'),
      lang: codeLang,
      isComplete: false,
    });
  } else if (insideTable) {
    blocks.push({
      type: 'table',
      content: tableBuffer.join('\n'),
      isComplete: false,
    });
  } else if (insideComponent) {
    blocks.push({
      type: 'component',
      content: componentBuffer.join('\n'),
      isComplete: false,
    });
  }

  return blocks;
}

export function renderMarkdownBlock(block: MarkdownBlock): string {
  switch (block.type) {
    case 'code_fence': {
      const escapedContent = escapeHtml(block.content);
      return `<pre><code>${escapedContent}</code></pre>`;
    }
    case 'table': {
      if (!block.isComplete) {
        return `<div class="vx-table-placeholder" style="padding: 10px; border: 1px dashed var(--vx-border-color, #ccc); border-radius: 6px; margin: 8px 0; font-size: 0.9em; opacity: 0.8; display: flex; align-items: center; gap: 8px;">⏳ Rendering data table...</div>`;
      }
      return parseMarkdown(block.content);
    }
    case 'component': {
      if (!block.isComplete) {
        return `<div class="vx-form-placeholder" style="padding: 10px; border: 1px dashed var(--vx-border-color, #ccc); border-radius: 6px; margin: 8px 0; font-size: 0.9em; opacity: 0.8; display: flex; align-items: center; gap: 8px;">⏳ Preparing interactive element...</div>`;
      }
      return parseMarkdown(block.content);
    }
    case 'heading': {
      const hText = block.content.trim();
      if (hText.startsWith('### ')) return `<h3>${renderInlineElements(hText.slice(4))}</h3>`;
      if (hText.startsWith('## ')) return `<h2>${renderInlineElements(hText.slice(3))}</h2>`;
      if (hText.startsWith('# ')) return `<h1>${renderInlineElements(hText.slice(2))}</h1>`;
      return `<p>${renderInlineElements(block.content)}</p>`;
    }
    case 'list': {
      return parseMarkdown(block.content);
    }
    case 'paragraph':
    default: {
      const inline = renderInlineElements(block.content.trim());
      return `<p>${inline.replace(/\n/g, '<br>')}</p>`;
    }
  }
}

export function parseStreamingMarkdown(text: string): string {
  const blocks = scanStreamingMarkdownBlocks(text);
  return blocks.map(renderMarkdownBlock).join('');
}

function parseTableRow(line: string) {
  const trimmed = line.trim();
  const withoutEdges = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '');
  return withoutEdges.split('|').map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  const cells = parseTableRow(line);
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function stripIncompleteStreamingTable(text: string) {
  const lines = text.split('\n');
  const endsWithNewline = text.endsWith('\n');
  let separatorIndex = -1;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (isTableSeparator(lines[index])) {
      separatorIndex = index;
      break;
    }
  }

  if (separatorIndex > 0 && lines[separatorIndex - 1].includes('|')) {
    const firstBodyIndex = separatorIndex + 1;
    const completedBodyRows = lines.slice(firstBodyIndex).filter(
      (line, index, bodyLines) =>
        line.includes('|')
        && (index < bodyLines.length - 1 || endsWithNewline),
    );

    if (completedBodyRows.length === 0) {
      return lines.slice(0, separatorIndex - 1).join('\n').trimEnd();
    }

    if (!endsWithNewline && lines[lines.length - 1]?.includes('|')) {
      lines.pop();
    }
    return lines.join('\n').trimEnd();
  }

  // Hide a trailing table header/separator fragment until enough structure is
  // available to render it. This prevents raw pipes flashing during streaming.
  let blockStart = 0;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].trim() === '') {
      blockStart = index + 1;
      break;
    }
  }
  const trailingBlock = lines.slice(blockStart);
  if (
    trailingBlock.length <= 2
    && trailingBlock.some((line) => line.includes('|'))
  ) {
    return lines.slice(0, blockStart).join('\n').trimEnd();
  }

  return text;
}

function renderTableFallback(headers: string[], rows: string[][]) {
  const cards = rows.map((row) => {
    const fields = headers.map((header, index) => {
      const value = row[index] || '—';
      return `<span class="md-table-field"><span class="md-table-label">${header}</span><span class="md-table-value">${value}</span></span>`;
    }).join('');
    return `<li class="md-table-row">${fields}</li>`;
  }).join('');
  return `<section class="md-table-list" aria-label="Response details"><ul class="md-table-fallback">${cards}</ul></section>`;
}

function renderMarkdownTables(html: string) {
  const lines = html.split('\n');
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const headerLine = lines[index];
    const separatorLine = lines[index + 1];
    if (
      !headerLine?.includes('|')
      || !separatorLine
      || !isTableSeparator(separatorLine)
    ) {
      output.push(headerLine);
      continue;
    }

    const headers = parseTableRow(headerLine);
    const rows: string[][] = [];
    let rowIndex = index + 2;
    while (rowIndex < lines.length && lines[rowIndex].includes('|')) {
      const row = parseTableRow(lines[rowIndex]);
      if (row.some(Boolean)) rows.push(row);
      rowIndex += 1;
    }

    // A GFM table may contain only a header and delimiter row.
    if (headers.length < 2) {
      output.push(headers.filter(Boolean).join(' · '));
      index += 1;
      continue;
    }

    const plainLength = (value: string) => value.replace(/<[^>]+>/g, '').length;
    const isCompact = (
      headers.length <= 4
      && rows.length <= 8
      && [...headers, ...rows.flat()].every((cell) => plainLength(cell) <= 80)
    );

    if (isCompact) {
      const heading = headers.map((header) => `<th scope="col">${header}</th>`).join('');
      const body = rows.map((row) => {
        const cells = headers.map((_, cellIndex) => `<td>${row[cellIndex] || '—'}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      output.push(`<section class="md-table-scroll" aria-label="Response table"><table><thead><tr>${heading}</tr></thead><tbody>${body}</tbody></table></section>`);
    } else {
      output.push(renderTableFallback(headers, rows));
    }

    index = rowIndex - 1;
  }

  return output.join('\n');
}

export function parseMarkdown(text: string) {
  let s = escapeHtml(stripHtmlLikeMarkupOutsideCode(
    normalizeHtmlEntities(text || ""),
    true,
    true,
  ));

  // Strip <thinking>/<thought> tags (LLM reasoning artifacts that leak into stream)
  s = s.replace(/&lt;thinking&gt;[\s\S]*?&lt;\/thinking&gt;/gi, '');
  s = s.replace(/&lt;thought&gt;[\s\S]*?&lt;\/thought&gt;/gi, '');
  // Also remove any unclosed/partial tags mid-stream
  s = s.replace(/&lt;thinking&gt;[\s\S]*$/gi, '');
  s = s.replace(/&lt;thought&gt;[\s\S]*$/gi, '');
  s = s.replace(/&lt;\/?(?:thinking|thought)&gt;/gi, '');

  // Trim both leading and trailing whitespace/newlines left over from thinking blocks or LLM formatting
  s = s.trim();

  // Preserve styled layout divs generated by the assistant, but keep the
  // attribute surface narrow because this content is assigned with innerHTML.
  s = s.replace(/&lt;div\s*([\s\S]*?)&gt;/g, function(_: string, attrs: string) {
    return `<div${sanitizeGeneratedDivAttributes(attrs)}>`;
  });
  s = s.replace(/&lt;\/div&gt;/g, '</div>');

  // Parse only whitelisted InteraOne components. All normal/raw HTML has
  // already been stripped above, so these internal controls can be rendered.
  s = s.replace(/&lt;interaone-form\s+id=&quot;([^&]+?)&quot;&gt;([\s\S]*?)&lt;\/interaone-form&gt;/g, function(_: string, formId: string, innerContent: string) {
    const safeFormId = protectGeneratedAttribute(formId);
    let content = innerContent;
    content = content.replace(/&lt;interaone-input\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
      const attrs = parseAttributes(attrStr);
      const name = protectGeneratedAttribute(attrs.name || '');
      const placeholder = protectGeneratedAttribute(attrs.placeholder || '');
      const val = protectGeneratedAttribute(attrs.value || '');
      return `<div class="vx-form-row"><input type="text" class="vx-form-input" name="${name}" placeholder="${placeholder}" value="${val}" data-interaone-input /></div>`;
    });
    content = content.replace(/&lt;interaone-checkbox\s+name=&quot;([^&]+?)&quot;&gt;([\s\S]+?)&lt;\/interaone-checkbox&gt;/g,
      function(_: string, name: string, label: string) {
        return `<div class="vx-form-row"><label class="vx-form-checkbox-label"><input type="checkbox" name="${protectGeneratedAttribute(name)}" data-interaone-checkbox /><span>${label}</span></label></div>`;
      }
    );
    content = content.replace(/&lt;interaone-radio\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
      const attrs = parseAttributes(attrStr);
      const name = protectGeneratedAttribute(attrs.name || '');
      const optionsStr = attrs.options || '';
      const options = optionsStr.split(',').map((o: string) => o.trim());
      const radiosHtml = options.map((opt: string, i: number) => `
        <label class="vx-form-radio-label">
          <input type="radio" name="${name}" value="${protectGeneratedAttribute(opt)}" ${i === 0 ? 'checked' : ''} data-interaone-radio />
          <span>${opt}</span>
        </label>
      `).join('');
      return `<div class="vx-form-row"><div class="vx-form-radio-group">${radiosHtml}</div></div>`;
    });
    content = content.replace(/&lt;interaone-select\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
      const attrs = parseAttributes(attrStr);
      const name = protectGeneratedAttribute(attrs.name || '');
      const placeholder = protectGeneratedAttribute(attrs.placeholder || 'Select option');
      const optionsStr = attrs.options || '';
      const options = optionsStr.split(',').map((o: string) => o.trim());
      const optionsHtml = options.map((opt: string) => `<option value="${protectGeneratedAttribute(opt)}">${opt}</option>`).join('');
      return `<div class="vx-form-row"><select class="vx-form-select" name="${name}" data-interaone-select><option value="" disabled selected>${placeholder}</option>${optionsHtml}</select></div>`;
    });
    content = content.replace(/&lt;interaone-date\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
      const attrs = parseAttributes(attrStr);
      const name = protectGeneratedAttribute(attrs.name || '');
      const minAttr = attrs.min || '';
      const minVal = minAttr === 'today' ? new Date().toISOString().split('T')[0] : minAttr;
      return `<div class="vx-form-row"><input type="date" class="vx-form-date" name="${name}" min="${minVal}" data-interaone-date /></div>`;
    });
    content = content.replace(/&lt;interaone-slider\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
      const attrs = parseAttributes(attrStr);
      const name = protectGeneratedAttribute(attrs.name || '');
      const min = protectGeneratedAttribute(attrs.min || '0');
      const max = protectGeneratedAttribute(attrs.max || '100');
      const step = protectGeneratedAttribute(attrs.step || '1');
      return `
        <div class="vx-form-row">
          <div class="vx-slider-header"><span class="vx-slider-value">Value: <span id="val-${name}">${min}</span></span></div>
          <input type="range" class="vx-form-slider" name="${name}" min="${min}" max="${max}" step="${step}" value="${min}" oninput="document.getElementById('val-${name}').textContent = this.value" data-interaone-slider />
        </div>
      `;
    });
    content = content.replace(/&lt;interaone-rating\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
      const attrs = parseAttributes(attrStr);
      const name = protectGeneratedAttribute(attrs.name || '');
      const max = parseInt(attrs.max || '5', 10) || 5;
      let starsHtml = '';
      for (let i = max; i >= 1; i--) {
        starsHtml += `<input type="radio" id="star${i}-${name}" name="${name}" value="${i}" data-interaone-rating /><label for="star${i}-${name}">★</label>`;
      }
      return `<div class="vx-form-row"><div class="vx-rating-stars">${starsHtml}</div></div>`;
    });
    content = content.replace(/&lt;interaone-otp\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
      const attrs = parseAttributes(attrStr);
      const name = protectGeneratedAttribute(attrs.name || '');
      const length = parseInt(attrs.length || '6', 10) || 6;
      let boxesHtml = '';
      for (let i = 0; i < length; i++) {
        boxesHtml += `<input type="text" maxlength="1" class="vx-otp-box" name="${name}-${i}" data-interaone-otp-box />`;
      }
      return `<div class="vx-form-row"><div class="vx-otp-container" data-interaone-otp name="${name}">${boxesHtml}</div></div>`;
    });

    return `
      <form class="vx-interactive-form vx-form-group" id="${safeFormId}" data-interaone-form="${safeFormId}">
        <div class="vx-form-body">${content}</div>
        <button type="submit" class="vx-form-submit" data-action="submit-group-form" data-target="${safeFormId}">Submit</button>
      </form>
    `;
  });

  s = s.replace(/&lt;interaone-input\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
    const attrs = parseAttributes(attrStr);
    const name = protectGeneratedAttribute(attrs.name || '');
    const placeholder = protectGeneratedAttribute(attrs.placeholder || '');
    const val = protectGeneratedAttribute(attrs.value || '');
    return `<div class="vx-interactive-form vx-input-wrapper"><input type="text" class="vx-form-input" name="${name}" placeholder="${placeholder}" value="${val}" data-interaone-input /><button class="vx-form-submit" data-action="submit-input" data-target="${name}">Submit</button></div>`;
  });

  s = s.replace(/&lt;interaone-button\s+action=&quot;([^&]+?)&quot;&gt;([\s\S]+?)&lt;\/interaone-button&gt;/g,
    function(_: string, action: string, label: string) {
      return `<button class="vx-form-button" data-interaone-button data-action="${protectGeneratedAttribute(action)}">${label}</button>`;
    }
  );

  s = s.replace(/&lt;interaone-checkbox\s+name=&quot;([^&]+?)&quot;&gt;([\s\S]+?)&lt;\/interaone-checkbox&gt;/g,
    function(_: string, name: string, label: string) {
      const safeName = protectGeneratedAttribute(name);
      return `<div class="vx-interactive-form vx-checkbox-wrapper"><label class="vx-form-checkbox-label"><input type="checkbox" name="${safeName}" data-interaone-checkbox /><span>${label}</span></label><button class="vx-form-submit" data-action="submit-checkbox" data-target="${safeName}">Submit</button></div>`;
    }
  );

  s = s.replace(/&lt;interaone-radio\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
    const attrs = parseAttributes(attrStr);
    const name = protectGeneratedAttribute(attrs.name || '');
    const optionsStr = attrs.options || '';
    const options = optionsStr.split(',').map((o: string) => o.trim());
    const radiosHtml = options.map((opt: string, i: number) => `
      <label class="vx-form-radio-label">
        <input type="radio" name="${name}" value="${protectGeneratedAttribute(opt)}" ${i === 0 ? 'checked' : ''} data-interaone-radio />
        <span>${opt}</span>
      </label>
    `).join('');
    return `
      <div class="vx-interactive-form vx-radio-wrapper" data-target="${name}">
        <div class="vx-form-radio-group">${radiosHtml}</div>
        <button class="vx-form-submit" data-action="submit-radio" data-target="${name}">Submit</button>
      </div>
    `;
  });

  s = s.replace(/&lt;interaone-select\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
    const attrs = parseAttributes(attrStr);
    const name = protectGeneratedAttribute(attrs.name || '');
    const placeholder = protectGeneratedAttribute(attrs.placeholder || 'Select option');
    const optionsStr = attrs.options || '';
    const options = optionsStr.split(',').map((o: string) => o.trim());
    const optionsHtml = options.map((opt: string) => `<option value="${protectGeneratedAttribute(opt)}">${opt}</option>`).join('');
    return `
      <div class="vx-interactive-form vx-select-wrapper" data-target="${name}">
        <select class="vx-form-select" name="${name}" data-interaone-select>
          <option value="" disabled selected>${placeholder}</option>
          ${optionsHtml}
        </select>
        <button class="vx-form-submit" data-action="submit-select" data-target="${name}">Submit</button>
      </div>
    `;
  });

  s = s.replace(/&lt;interaone-date\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
    const attrs = parseAttributes(attrStr);
    const name = protectGeneratedAttribute(attrs.name || '');
    const minAttr = attrs.min || '';
    const minVal = minAttr === 'today' ? new Date().toISOString().split('T')[0] : minAttr;
    return `
      <div class="vx-interactive-form vx-date-wrapper" data-target="${name}">
        <input type="date" class="vx-form-date" name="${name}" min="${minVal}" data-interaone-date />
        <button class="vx-form-submit" data-action="submit-date" data-target="${name}">Submit</button>
      </div>
    `;
  });

  s = s.replace(/&lt;interaone-slider\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
    const attrs = parseAttributes(attrStr);
    const name = protectGeneratedAttribute(attrs.name || '');
    const min = protectGeneratedAttribute(attrs.min || '0');
    const max = protectGeneratedAttribute(attrs.max || '100');
    const step = protectGeneratedAttribute(attrs.step || '1');
    return `
      <div class="vx-interactive-form vx-slider-wrapper" data-target="${name}">
        <div class="vx-slider-header"><span class="vx-slider-value">Value: <span id="val-${name}">${min}</span></span></div>
        <input type="range" class="vx-form-slider" name="${name}" min="${min}" max="${max}" step="${step}" value="${min}" oninput="document.getElementById('val-${name}').textContent = this.value" data-interaone-slider />
        <button class="vx-form-submit" data-action="submit-slider" data-target="${name}">Submit</button>
      </div>
    `;
  });

  s = s.replace(/&lt;interaone-card\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
    const attrs = parseAttributes(attrStr);
    const action = protectGeneratedAttribute(attrs.action || '');
    const image = attrs.image || '';
    const title = attrs.title || '';
    const subtitle = attrs.subtitle || '';
    return `
      <button class="vx-form-card" data-interaone-button data-action="${action}">
        ${image ? `<img src="${image}" alt="${title}" class="vx-card-image" />` : ''}
        <div class="vx-card-content">
          <div class="vx-card-title">${title}</div>
          <div class="vx-card-subtitle">${subtitle}</div>
        </div>
      </button>
    `;
  });

  s = s.replace(/&lt;interaone-rating\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
    const attrs = parseAttributes(attrStr);
    const name = protectGeneratedAttribute(attrs.name || '');
    const max = parseInt(attrs.max || '5', 10) || 5;
    let starsHtml = '';
    for (let i = max; i >= 1; i--) {
      starsHtml += `<input type="radio" id="star${i}-${name}" name="${name}" value="${i}" data-interaone-rating /><label for="star${i}-${name}">★</label>`;
    }
    return `
      <div class="vx-interactive-form vx-rating-wrapper" data-target="${name}">
        <div class="vx-rating-stars">${starsHtml}</div>
        <button class="vx-form-submit" data-action="submit-rating" data-target="${name}">Submit</button>
      </div>
    `;
  });

  s = s.replace(/&lt;interaone-otp\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
    const attrs = parseAttributes(attrStr);
    const name = protectGeneratedAttribute(attrs.name || '');
    const length = parseInt(attrs.length || '6', 10) || 6;
    let boxesHtml = '';
    for (let i = 0; i < length; i++) {
      boxesHtml += `<input type="text" maxlength="1" class="vx-otp-box" name="${name}-${i}" data-interaone-otp-box />`;
    }
    return `
      <div class="vx-interactive-form vx-otp-wrapper" data-target="${name}">
        <div class="vx-otp-container" data-interaone-otp name="${name}">${boxesHtml}</div>
        <button class="vx-form-submit" data-action="submit-otp" data-target="${name}">Submit</button>
      </div>
    `;
  });


  s = s
    .replace(/&lt;\/?interaone-[\s\S]*?&gt;/gi, '')
    .replace(/&lt;\/?interaone-[\s\S]*$/gi, '');

  // Code blocks (``` ... ```)
  s = s.replace(/```[\w]*\n?([\s\S]*?)```/g, function (_, code) {
    return '<pre><code>' + code.trim() + '</code></pre>';
  });

  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Auto-link bare URLs
  s = s.replace(/(?<![="'(])https?:\/\/[^\s<>"')]+/g, function (url) {
    return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
  });

  // Headers
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  s = s.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold + italic
  s = renderInlineMarkdown(s);
  s = s.replace(/\*\*/g, '').replace(/__/g, '');

  // Unordered lists
  s = s.replace(/((?:^[ \t]*[-*+] .+\n?)+)/gm, function (block) {
    const items = block.trim().split('\n').map(function (line) {
      return '<li>' + line.replace(/^[ \t]*[-*+] /, '') + '</li>';
    }).join('');
    return '<ul>' + items + '</ul>';
  });

  // Ordered lists
  s = s.replace(/((?:^[ \t]*\d+\. .+\n?)+)/gm, function (block) {
    const items = block.trim().split('\n').map(function (line) {
      return '<li>' + line.replace(/^[ \t]*\d+\. /, '') + '</li>';
    }).join('');
    return '<ol>' + items + '</ol>';
  });

  // Markdown tables become compact labeled cards, which remain readable in the
  // narrow widget instead of forcing horizontal scrolling or exposing pipes.
  s = renderMarkdownTables(s);

  // Paragraphs and Block element wrapping
  const blockTagRegex = /(<ul>[\s\S]*?<\/ul>|<ol>[\s\S]*?<\/ol>|<pre>[\s\S]*?<\/pre>|<h3>[\s\S]*?<\/h3>|<h2>[\s\S]*?<\/h2>|<h1>[\s\S]*?<\/h1>|<section class="md-table-(?:scroll|list)"[\s\S]*?<\/section>|<form[\s\S]*?<\/form>|<div[\s\S]*?<\/div>|<button[\s\S]*?<\/button>)/g;
  const parts = s.split(blockTagRegex);

  return parts
    .map((part) => {
      const trimmedPart = part.trim();
      if (!trimmedPart) return "";
      if (
        trimmedPart.startsWith('<ul') ||
        trimmedPart.startsWith('<ol') ||
        trimmedPart.startsWith('<pre') ||
        trimmedPart.startsWith('<h1') ||
        trimmedPart.startsWith('<h2') ||
        trimmedPart.startsWith('<h3') ||
        trimmedPart.startsWith('<section class="md-table-scroll"') ||
        trimmedPart.startsWith('<section class="md-table-list"') ||
        trimmedPart.startsWith('<form') ||
        trimmedPart.startsWith('<div') ||
        trimmedPart.startsWith('<button')
      ) {
        return trimmedPart;
      }

      const paragraphs = part.split(/\n{2,}/);
      return paragraphs
        .map((p) => {
          const trimmed = p.trim();
          if (!trimmed) return "";
          const content = trimmed;
          return `<p>${content}</p>`;
        })
        .filter(Boolean)
        .join('');
    })
    .filter(Boolean)
    .join('');
}
