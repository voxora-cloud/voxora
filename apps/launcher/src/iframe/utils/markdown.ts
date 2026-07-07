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

/**
 * Interactive components are only useful once their complete markup is
 * available. While streaming, withhold the component section so partial tags
 * such as "<interaone-but" are not rendered as escaped text.
 *
 * The system prompt requires interactive components at the bottom of a reply,
 * so everything from the first component marker onward is deferred until the
 * final message arrives.
 */
export function stripStreamingInteractiveMarkup(text: string) {
  if (!text) return "";

  const markers = ['<interaone-', '<div'];
  const lowerText = text.toLowerCase();
  
  let firstIndex = -1;
  for (const marker of markers) {
    const idx = lowerText.indexOf(marker);
    if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) {
      firstIndex = idx;
    }
  }

  if (firstIndex !== -1) {
    return text.slice(0, firstIndex).trimEnd();
  }

  // A stream chunk can end partway through the opening marker. Hide that
  // suffix as soon as it starts instead of briefly exposing raw HTML.
  const lastOpeningBracket = lowerText.lastIndexOf('<');
  if (lastOpeningBracket !== -1) {
    const trailingText = lowerText.slice(lastOpeningBracket);
    for (const marker of markers) {
      if (marker.startsWith(trailingText)) {
        return text.slice(0, lastOpeningBracket).trimEnd();
      }
    }
  }

  return text;
}

export function parseStreamingMarkdown(text: string) {
  return parseMarkdown(stripIncompleteStreamingTable(
    stripStreamingInteractiveMarkup(text),
  ));
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
  let s = escapeHtml(text || "");

  // Strip <thinking>/<thought> tags (LLM reasoning artifacts that leak into stream)
  s = s.replace(/&lt;thinking&gt;[\s\S]*?&lt;\/thinking&gt;/gi, '');
  s = s.replace(/&lt;thought&gt;[\s\S]*?&lt;\/thought&gt;/gi, '');
  // Also remove any unclosed/partial tags mid-stream
  s = s.replace(/&lt;thinking&gt;[\s\S]*$/gi, '');
  s = s.replace(/&lt;thought&gt;[\s\S]*$/gi, '');
  s = s.replace(/&lt;\/?(?:thinking|thought)&gt;/gi, '');

  // Trim both leading and trailing whitespace/newlines left over from thinking blocks or LLM formatting
  s = s.trim();

  // Unescape divs to support HTML layout blocks
  s = s.replace(/&lt;div\s*([\s\S]*?)&gt;/g, function(_: string, attrs: string) {
    const cleanAttrs = attrs.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    return `<div ${cleanAttrs}>`.replace(/\s+>/, '>');
  });
  s = s.replace(/&lt;\/div&gt;/g, '</div>');

  // Parse InteraOne Form Containers (multiple fields grouped in one submit box)
  // Parse InteraOne Form Containers (multiple fields grouped in one submit box)
  s = s.replace(/&lt;interaone-form\s+id=&quot;([^&]+?)&quot;&gt;([\s\S]*?)&lt;\/interaone-form&gt;/g, function(_, formId, innerContent) {
    let content = innerContent;
    // Replace inputs inside form to not have individual submit button wrappers
    content = content.replace(/&lt;interaone-input\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
      const attrs = parseAttributes(attrStr);
      const name = attrs.name || '';
      const placeholder = attrs.placeholder || '';
      const val = attrs.value || '';
      return `<div class="vx-form-row"><input type="text" class="vx-form-input" name="${name}" placeholder="${placeholder}" value="${val}" data-interaone-input /></div>`;
    });
    // Replace checkboxes inside form
    content = content.replace(/&lt;interaone-checkbox\s+name=&quot;([^&]+?)&quot;&gt;([\s\S]+?)&lt;\/interaone-checkbox&gt;/g,
      '<div class="vx-form-row"><label class="vx-form-checkbox-label"><input type="checkbox" name="$1" data-interaone-checkbox /><span>$2</span></label></div>'
    );
    // Replace radios inside form
    content = content.replace(/&lt;interaone-radio\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
      const attrs = parseAttributes(attrStr);
      const name = attrs.name || '';
      const optionsStr = attrs.options || '';
      const options = optionsStr.split(',').map((o: string) => o.trim());
      const radiosHtml = options.map((opt: string, i: number) => `
        <label class="vx-form-radio-label">
          <input type="radio" name="${name}" value="${opt}" ${i === 0 ? 'checked' : ''} data-interaone-radio />
          <span>${opt}</span>
        </label>
      `).join('');
      return `<div class="vx-form-row"><div class="vx-form-radio-group">${radiosHtml}</div></div>`;
    });

    return `
      <form class="vx-interactive-form vx-form-group" id="${formId}" data-interaone-form="${formId}">
        <div class="vx-form-body">${content}</div>
        <button type="submit" class="vx-form-submit" data-action="submit-group-form" data-target="${formId}">Submit</button>
      </form>
    `;
  });

  // Parse InteraOne Interactive Components (escaped XML)
  s = s.replace(/&lt;interaone-input\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
    const attrs = parseAttributes(attrStr);
    const name = attrs.name || '';
    const placeholder = attrs.placeholder || '';
    const val = attrs.value || '';
    return `<div class="vx-interactive-form vx-input-wrapper"><input type="text" class="vx-form-input" name="${name}" placeholder="${placeholder}" value="${val}" data-interaone-input /><button class="vx-form-submit" data-action="submit-input" data-target="${name}">Submit</button></div>`;
  });

  s = s.replace(/&lt;interaone-button\s+action=&quot;([^&]+?)&quot;&gt;([\s\S]+?)&lt;\/interaone-button&gt;/g,
    '<button class="vx-form-button" data-interaone-button data-action="$1">$2</button>'
  );

  s = s.replace(/&lt;interaone-checkbox\s+name=&quot;([^&]+?)&quot;&gt;([\s\S]+?)&lt;\/interaone-checkbox&gt;/g,
    '<div class="vx-interactive-form vx-checkbox-wrapper"><label class="vx-form-checkbox-label"><input type="checkbox" name="$1" data-interaone-checkbox /><span>$2</span></label><button class="vx-form-submit" data-action="submit-checkbox" data-target="$1">Submit</button></div>'
  );

  s = s.replace(/&lt;interaone-radio\s+([\s\S]*?)(?:\/)?&gt;/g, function(_: string, attrStr: string) {
    const attrs = parseAttributes(attrStr);
    const name = attrs.name || '';
    const optionsStr = attrs.options || '';
    const options = optionsStr.split(',').map((o: string) => o.trim());
    const radiosHtml = options.map((opt: string, i: number) => `
      <label class="vx-form-radio-label">
        <input type="radio" name="${name}" value="${opt}" ${i === 0 ? 'checked' : ''} data-interaone-radio />
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
  s = s.replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^\n*]+?)\*/g, '<em>$1</em>');
  s = s.replace(/__([\s\S]+?)__/g, '<strong>$1</strong>');
  s = s.replace(/_([^\n_]+?)_/g, '<em>$1</em>');

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
