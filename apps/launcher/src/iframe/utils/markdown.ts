export function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  // Parse InteraOne Form Containers (multiple fields grouped in one submit box)
  s = s.replace(/&lt;interaone-form\s+id=&quot;([^&]+)&quot;&gt;([\s\S]*?)&lt;\/interaone-form&gt;/g, function(_, formId, innerContent) {
    let content = innerContent;
    // Replace inputs inside form to not have individual submit button wrappers
    content = content.replace(/&lt;interaone-input\s+name=&quot;([^&]+)&quot;\s+placeholder=&quot;([^&]+)&quot;\s*(?:\/)?&gt;/g,
      '<div class="vx-form-row"><input type="text" class="vx-form-input" name="$1" placeholder="$2" data-interaone-input /></div>'
    );
    // Replace checkboxes inside form
    content = content.replace(/&lt;interaone-checkbox\s+name=&quot;([^&]+)&quot;&gt;([^&]+)&lt;\/interaone-checkbox&gt;/g,
      '<div class="vx-form-row"><label class="vx-form-checkbox-label"><input type="checkbox" name="$1" data-interaone-checkbox /><span>$2</span></label></div>'
    );
    // Replace radios inside form
    content = content.replace(/&lt;interaone-radio\s+name=&quot;([^&]+)&quot;\s+options=&quot;([^&]+)&quot;\s*(?:\/)?&gt;/g, function(_: string, name: string, optionsStr: string) {
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
  s = s.replace(/&lt;interaone-input\s+name=&quot;([^&]+)&quot;\s+placeholder=&quot;([^&]+)&quot;\s*(?:\/)?&gt;/g, 
    '<div class="vx-interactive-form vx-input-wrapper"><input type="text" class="vx-form-input" name="$1" placeholder="$2" data-interaone-input /><button class="vx-form-submit" data-action="submit-input" data-target="$1">Submit</button></div>'
  );

  s = s.replace(/&lt;interaone-button\s+action=&quot;([^&]+)&quot;&gt;([^&]+)&lt;\/interaone-button&gt;/g,
    '<button class="vx-form-button" data-interaone-button data-action="$1">$2</button>'
  );

  s = s.replace(/&lt;interaone-checkbox\s+name=&quot;([^&]+)&quot;&gt;([^&]+)&lt;\/interaone-checkbox&gt;/g,
    '<div class="vx-interactive-form vx-checkbox-wrapper"><label class="vx-form-checkbox-label"><input type="checkbox" name="$1" data-interaone-checkbox /><span>$2</span></label><button class="vx-form-submit" data-action="submit-checkbox" data-target="$1">Submit</button></div>'
  );

  s = s.replace(/&lt;interaone-radio\s+name=&quot;([^&]+)&quot;\s+options=&quot;([^&]+)&quot;\s*(?:\/)?&gt;/g, function(_, name, optionsStr) {
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

  // Horizontal rule
  s = s.replace(/^[-*]{3,}$/gm, '<hr>');

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

  // Paragraphs and Block element wrapping
  const blockTagRegex = /(<ul>[\s\S]*?<\/ul>|<ol>[\s\S]*?<\/ol>|<pre>[\s\S]*?<\/pre>|<h3>[\s\S]*?<\/h3>|<h2>[\s\S]*?<\/h2>|<h1>[\s\S]*?<\/h1>|<hr>|<form[\s\S]*?<\/form>|<div class="vx-interactive-form[\s\S]*?<\/div>|<button[\s\S]*?<\/button>)/g;
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
        trimmedPart.startsWith('<hr') ||
        trimmedPart.startsWith('<form') ||
        trimmedPart.startsWith('<div class="vx-interactive-form') ||
        trimmedPart.startsWith('<button')
      ) {
        return trimmedPart;
      }

      const paragraphs = part.split(/\n{2,}/);
      return paragraphs
        .map((p) => {
          const trimmed = p.trim();
          if (!trimmed) return "";
          const content = trimmed.replace(/\n/g, '<br>');
          return `<p>${content}</p>`;
        })
        .filter(Boolean)
        .join('');
    })
    .filter(Boolean)
    .join('');
}
