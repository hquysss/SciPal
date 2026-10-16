export type CodeLang = 'python' | 'cpp' | 'javascript' | 'html' | 'css';

export type TokenKind = 'keyword' | 'function' | 'string' | 'number' | 'comment' | 'operator' | 'text';

export interface Token {
  kind: TokenKind;
  text: string;
}

type CodeRules = {
  readonly keywords: ReadonlySet<string>;
  readonly functions: ReadonlySet<string>;
  readonly lineComment: string | null;
  readonly blockComments: boolean;
  readonly tripleStrings: boolean;
  readonly templateStrings: boolean;
};

type CodeLine = {
  readonly tokens: Token[];
  readonly blockComment: boolean;
  readonly tripleQuote: string | null;
};

type CommentLine = {
  readonly tokens: Token[];
  readonly comment: boolean;
};

const PYTHON_KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield',
]);
const CPP_KEYWORDS = new Set([
  'auto', 'bool', 'break', 'case', 'char', 'class', 'const', 'continue', 'double', 'else', 'enum', 'float', 'for', 'if', 'int', 'long', 'namespace', 'private', 'public', 'return', 'short', 'signed', 'static', 'string', 'struct', 'switch', 'template', 'unsigned', 'using', 'void', 'while',
]);
const JAVASCRIPT_KEYWORDS = new Set([
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delete', 'do', 'else', 'export', 'false', 'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'of', 'return', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while', 'yield',
]);

const PYTHON_RULES: CodeRules = {
  keywords: PYTHON_KEYWORDS,
  functions: new Set(['abs', 'input', 'int', 'len', 'print', 'range', 'str', 'sum']),
  lineComment: '#',
  blockComments: false,
  tripleStrings: true,
  templateStrings: false,
};
const CPP_RULES: CodeRules = {
  keywords: CPP_KEYWORDS,
  functions: new Set(['cin', 'cout', 'main', 'max', 'min', 'sort']),
  lineComment: '//',
  blockComments: true,
  tripleStrings: false,
  templateStrings: false,
};
const JAVASCRIPT_RULES: CodeRules = {
  keywords: JAVASCRIPT_KEYWORDS,
  functions: new Set(['alert', 'console', 'log', 'map', 'prompt']),
  lineComment: '//',
  blockComments: true,
  tripleStrings: false,
  templateStrings: true,
};

function push(tokens: Token[], kind: TokenKind, text: string): void {
  if (!text) return;
  const last = tokens.at(-1);
  if (last?.kind === kind) {
    last.text += text;
    return;
  }
  tokens.push({ kind, text });
}

function quotedEnd(line: string, start: number, quote: string): number {
  let index = start + 1;
  while (index < line.length) {
    if (line[index] === '\\') {
      index += 2;
      continue;
    }
    if (line[index] === quote) return index + 1;
    index += 1;
  }
  return line.length;
}

function tokenizeCode(line: string, rules: CodeRules, blockComment: boolean, tripleQuote: string | null): CodeLine {
  const tokens: Token[] = [];
  let index = 0;
  let block = blockComment;
  let triple = tripleQuote;

  while (index < line.length) {
    if (block) {
      const end = line.indexOf('*/', index);
      if (end === -1) {
        push(tokens, 'comment', line.slice(index));
        return { tokens, blockComment: true, tripleQuote: triple };
      }
      push(tokens, 'comment', line.slice(index, end + 2));
      index = end + 2;
      block = false;
      continue;
    }

    if (triple) {
      const end = line.indexOf(triple, index);
      if (end === -1) {
        push(tokens, 'string', line.slice(index));
        return { tokens, blockComment: block, tripleQuote: triple };
      }
      push(tokens, 'string', line.slice(index, end + triple.length));
      index = end + triple.length;
      triple = null;
      continue;
    }

    if (rules.blockComments && line.startsWith('/*', index)) {
      const end = line.indexOf('*/', index + 2);
      if (end === -1) {
        push(tokens, 'comment', line.slice(index));
        return { tokens, blockComment: true, tripleQuote: null };
      }
      push(tokens, 'comment', line.slice(index, end + 2));
      index = end + 2;
      continue;
    }

    if (rules.lineComment && line.startsWith(rules.lineComment, index)) {
      push(tokens, 'comment', line.slice(index));
      return { tokens, blockComment: block, tripleQuote: triple };
    }

    const part = line.slice(index);
    if (rules.tripleStrings && (part.startsWith('"""') || part.startsWith("'''"))) {
      const delimiter = part.slice(0, 3);
      const end = line.indexOf(delimiter, index + delimiter.length);
      if (end === -1) {
        push(tokens, 'string', line.slice(index));
        return { tokens, blockComment: block, tripleQuote: delimiter };
      }
      push(tokens, 'string', line.slice(index, end + delimiter.length));
      index = end + delimiter.length;
      continue;
    }

    const character = line[index] ?? '';
    if (character === '"' || character === "'" || (rules.templateStrings && character === '`')) {
      const end = quotedEnd(line, index, character);
      push(tokens, 'string', line.slice(index, end));
      index = end;
      continue;
    }

    const number = part.match(/^\d+(?:\.\d+)?/);
    if (number) {
      push(tokens, 'number', number[0]);
      index += number[0].length;
      continue;
    }

    const word = part.match(/^[A-Za-z_$][\w$]*/);
    if (word) {
      const text = word[0];
      const rest = line.slice(index + text.length);
      const kind: TokenKind = rules.keywords.has(text)
        ? 'keyword'
        : rules.functions.has(text) || /^\s*\(/.test(rest)
          ? 'function'
          : 'text';
      push(tokens, kind, text);
      index += text.length;
      continue;
    }

    if (/^[+\-*/%=<>!&|^~]+/.test(part)) {
      const operator = part.match(/^[+\-*/%=<>!&|^~]+/);
      if (operator) {
        push(tokens, 'operator', operator[0]);
        index += operator[0].length;
        continue;
      }
    }

    push(tokens, 'text', character);
    index += 1;
  }

  return { tokens, blockComment: block, tripleQuote: triple };
}

function tagEnd(line: string, start: number): number {
  let quote = '';
  for (let index = start + 1; index < line.length; index += 1) {
    const character = line[index] ?? '';
    if (quote) {
      if (character === '\\') {
        index += 1;
      } else if (character === quote) {
        quote = '';
      }
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index + 1;
    }
  }
  return line.length;
}

function tokenizeTag(tag: string, tokens: Token[]): void {
  let index = 0;
  if (tag.startsWith('</')) {
    push(tokens, 'text', '</');
    index = 2;
  } else if (tag.startsWith('<')) {
    push(tokens, 'text', '<');
    index = 1;
  }

  while (/\s/.test(tag[index] ?? '')) {
    push(tokens, 'text', tag[index] ?? '');
    index += 1;
  }

  const name = tag.slice(index).match(/^[A-Za-z][\w:-]*/);
  if (!name) {
    push(tokens, 'text', tag.slice(index));
    return;
  }
  push(tokens, 'function', name[0]);
  index += name[0].length;

  while (index < tag.length) {
    const character = tag[index] ?? '';
    if (character === '"' || character === "'") {
      const end = quotedEnd(tag, index, character);
      push(tokens, 'string', tag.slice(index, end));
      index = end;
      continue;
    }
    const attribute = tag.slice(index).match(/^[A-Za-z_:][\w:.-]*/);
    if (attribute) {
      push(tokens, 'keyword', attribute[0]);
      index += attribute[0].length;
      continue;
    }
    push(tokens, 'text', character);
    index += 1;
  }
}

function tokenizeHtml(line: string, inComment: boolean): CommentLine {
  const tokens: Token[] = [];
  let index = 0;
  let comment = inComment;

  while (index < line.length) {
    if (comment) {
      const end = line.indexOf('-->', index);
      if (end === -1) {
        push(tokens, 'comment', line.slice(index));
        return { tokens, comment: true };
      }
      push(tokens, 'comment', line.slice(index, end + 3));
      index = end + 3;
      comment = false;
      continue;
    }

    const tagStart = line.indexOf('<', index);
    if (tagStart === -1) {
      push(tokens, 'text', line.slice(index));
      break;
    }
    if (tagStart > index) push(tokens, 'text', line.slice(index, tagStart));
    if (line.startsWith('<!--', tagStart)) {
      const end = line.indexOf('-->', tagStart + 4);
      if (end === -1) {
        push(tokens, 'comment', line.slice(tagStart));
        return { tokens, comment: true };
      }
      push(tokens, 'comment', line.slice(tagStart, end + 3));
      index = end + 3;
      continue;
    }

    const end = tagEnd(line, tagStart);
    tokenizeTag(line.slice(tagStart, end), tokens);
    index = end;
  }

  return { tokens, comment };
}

function tokenizeCss(line: string, inComment: boolean): CommentLine {
  const tokens: Token[] = [];
  let index = 0;
  let comment = inComment;

  while (index < line.length) {
    if (comment) {
      const end = line.indexOf('*/', index);
      if (end === -1) {
        push(tokens, 'comment', line.slice(index));
        return { tokens, comment: true };
      }
      push(tokens, 'comment', line.slice(index, end + 2));
      index = end + 2;
      comment = false;
      continue;
    }

    if (line.startsWith('/*', index)) {
      const end = line.indexOf('*/', index + 2);
      if (end === -1) {
        push(tokens, 'comment', line.slice(index));
        return { tokens, comment: true };
      }
      push(tokens, 'comment', line.slice(index, end + 2));
      index = end + 2;
      continue;
    }

    const character = line[index] ?? '';
    if (character === '"' || character === "'") {
      const end = quotedEnd(line, index, character);
      push(tokens, 'string', line.slice(index, end));
      index = end;
      continue;
    }

    const part = line.slice(index);
    const number = part.match(/^\d+(?:\.\d+)?(?:%|[A-Za-z]+)?/);
    if (number) {
      push(tokens, 'number', number[0]);
      index += number[0].length;
      continue;
    }

    const word = part.match(/^[A-Za-z_-][\w-]*/);
    if (word) {
      const text = word[0];
      const rest = line.slice(index + text.length);
      const kind: TokenKind = /^\s*:/.test(rest)
        ? 'keyword'
        : /^\s*(?:\{|,)/.test(rest)
          ? 'function'
          : 'text';
      push(tokens, kind, text);
      index += text.length;
      continue;
    }

    push(tokens, 'text', character);
    index += 1;
  }

  return { tokens, comment };
}

export function highlight(code: string, lang: CodeLang): Token[][] {
  let blockComment = false;
  let htmlComment = false;
  let tripleQuote: string | null = null;

  return code.split(/\r?\n/).map((line) => {
    if (lang === 'html') {
      const result = tokenizeHtml(line, htmlComment);
      htmlComment = result.comment;
      return result.tokens;
    }
    if (lang === 'css') {
      const result = tokenizeCss(line, blockComment);
      blockComment = result.comment;
      return result.tokens;
    }

    const rules = lang === 'python' ? PYTHON_RULES : lang === 'cpp' ? CPP_RULES : JAVASCRIPT_RULES;
    const result = tokenizeCode(line, rules, blockComment, tripleQuote);
    blockComment = result.blockComment;
    tripleQuote = result.tripleQuote;
    return result.tokens;
  });
}
