export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Converts markdown text into valid semantic HTML for emails.
 */
export function parseMarkdown(text: string): string {
  let s = escapeHtml(text || "");

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
  const blockTagRegex = /(<ul>[\s\S]*?<\/ul>|<ol>[\s\S]*?<\/ol>|<pre>[\s\S]*?<\/pre>|<h3>[\s\S]*?<\/h3>|<h2>[\s\S]*?<\/h2>|<h1>[\s\S]*?<\/h1>|<hr>)/g;
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
        trimmedPart.startsWith('<hr')
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

/**
 * Converts markdown text into Telegram-compatible HTML tags for parse_mode="HTML".
 * Note that Telegram only supports <b>, <i>, <code>, <pre>, and <a> tags.
 */
export function parseTelegramHtml(text: string): string {
  if (!text) return "";

  let s = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  s = s.replace(/```[\w]*\n?([\s\S]*?)```/g, function (_, code) {
    return '<pre>' + code.trim() + '</pre>';
  });

  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');

  // Bold + italic
  s = s.replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<b><i>$1</i></b>');
  s = s.replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/\*([^\n*]+?)\*/g, '<i>$1</i>');
  s = s.replace(/__([\s\S]+?)__/g, '<b>$1</b>');
  s = s.replace(/_([^\n_]+?)_/g, '<i>$1</i>');

  // Headers
  s = s.replace(/^### (.+)$/gm, '<b>$1</b>');
  s = s.replace(/^## (.+)$/gm, '<b>$1</b>');
  s = s.replace(/^# (.+)$/gm, '<b>$1</b>');

  // Horizontal divider
  s = s.replace(/^[-*]{3,}$/gm, '───');

  // Lists (convert to unicode bullets)
  s = s.replace(/^[ \t]*[-*+] (.+)$/gm, '• $1');

  return s;
}

/**
 * Converts markdown text into native WhatsApp-compatible syntax formatting.
 */
export function parseWhatsAppMarkdown(text: string): string {
  if (!text) return "";

  let s = text;

  // Links: [text](url) -> text (url)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)');

  // Bold + italic
  s = s.replace(/\*\*\*([\s\S]+?)\*\*\*/g, '*_$1_*');
  s = s.replace(/\*\*([\s\S]+?)\*\*/g, '*$1*');
  s = s.replace(/__([\s\S]+?)__/g, '*$1*');

  s = s.replace(/\*([^\n*]+?)\*/g, '_$1_');
  s = s.replace(/_([^\n_]+?)_/g, '_$1_');

  // Headers
  s = s.replace(/^### (.+)$/gm, '*$1*');
  s = s.replace(/^## (.+)$/gm, '*$1*');
  s = s.replace(/^# (.+)$/gm, '*$1*');

  // Horizontal divider
  s = s.replace(/^[-*]{3,}$/gm, '───');

  return s;
}
