// y = f(x) expressions for the function-graph simulation, parsed by hand: no eval, no Function.
// Grammar (implicit multiplication allowed between factors, e.g. `2x`, `a sin(x)`):
//   expr   := term (('+' | '-') term)*
//   term   := unary (('*' | '/') unary | unary)*
//   unary  := ('+' | '-') unary | power
//   power  := atom ('^' unary)?            right-associative: 2^3^2 = 2^9
//   atom   := number | name | fn '(' expr ')' | '(' expr ')'
// Names: the variables (`x` by default; `x`, `y`, `t` in 3D), the constants `pi` and `e`, and
// single-letter parameters declared by the teacher.
// Keep backend/src/schemas/graphExpression.ts in sync (the backend cannot import this package).

export type GraphNode =
  | { type: 'num'; value: number }
  | { type: 'var'; name: string }
  | { type: 'neg'; arg: GraphNode }
  | { type: 'bin'; op: '+' | '-' | '*' | '/' | '^'; left: GraphNode; right: GraphNode }
  | { type: 'call'; fn: GraphFunction; arg: GraphNode };

export const GRAPH_FUNCTIONS = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'ln', 'exp'] as const;
export type GraphFunction = (typeof GRAPH_FUNCTIONS)[number];

export const MAX_GRAPH_EXPRESSION = 200;
/** A parameter is one lowercase letter other than x (the variable) and e (the constant). */
export const GRAPH_PARAMETER_NAME = /^[a-df-wyz]$/;

export interface GraphError {
  message: { en: string; vi: string };
  /** Character position of the problem. */
  at: number;
}
export type GraphParse = { ok: true; ast: GraphNode } | { ok: false; error: GraphError };

type Token =
  | { kind: 'num'; value: number; at: number }
  | { kind: 'name'; value: string; at: number }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' | '^' | '(' | ')'; at: number }
  | { kind: 'end'; at: number };

class ParseError extends Error {
  constructor(readonly detail: GraphError) {
    super(detail.message.en);
  }
}

const fail = (at: number, en: string, vi: string): never => {
  throw new ParseError({ at, message: { en, vi } });
};

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === ' ' || ch === '\t') {
      i += 1;
    } else if (/[0-9.]/.test(ch)) {
      const match = /^(\d+\.?\d*|\.\d+)/.exec(source.slice(i));
      if (!match) fail(i, 'Unreadable number.', 'Số không đọc được.');
      tokens.push({ kind: 'num', value: Number(match![0]), at: i });
      i += match![0].length;
    } else if (/[a-z]/i.test(ch)) {
      const match = /^[a-z]+/i.exec(source.slice(i))!;
      tokens.push({ kind: 'name', value: match[0].toLowerCase(), at: i });
      i += match[0].length;
    } else if ('+-*/^()'.includes(ch)) {
      if (ch === '*' && source[i + 1] === '*') fail(i, 'Use ^ for powers.', 'Dùng ^ cho lũy thừa.');
      tokens.push({ kind: 'op', value: ch as '+', at: i });
      i += 1;
    } else {
      fail(i, `Unexpected "${ch}".`, `Ký tự "${ch}" không dùng được.`);
    }
  }
  tokens.push({ kind: 'end', at: source.length });
  return tokens;
}

/** Split a run of letters like `ax` into known names: functions, constants, variables and parameters. */
function expandNames(tokens: Token[], parameters: ReadonlySet<string>, variables: ReadonlySet<string>): Token[] {
  const out: Token[] = [];
  for (const token of tokens) {
    if (token.kind !== 'name') {
      out.push(token);
      continue;
    }
    let rest = token.value;
    let at = token.at;
    while (rest) {
      const fn = GRAPH_FUNCTIONS.find((f) => rest.startsWith(f));
      const word = fn ?? (rest.startsWith('pi') ? 'pi' : rest[0]!);
      if (!fn && word !== 'pi' && word !== 'e' && !variables.has(word) && !parameters.has(word)) {
        fail(at, `Unknown name "${token.value}". Declare it as a parameter.`, `Tên "${token.value}" chưa được khai báo làm tham số.`);
      }
      out.push({ kind: 'name', value: word, at });
      rest = rest.slice(word.length);
      at += word.length;
    }
  }
  return out;
}

export function parseGraphExpression(source: string, parameters: readonly string[] = [], variables: readonly string[] = ['x']): GraphParse {
  try {
    if (!source.trim()) fail(0, 'Enter an expression.', 'Hãy nhập biểu thức.');
    if (source.length > MAX_GRAPH_EXPRESSION) fail(MAX_GRAPH_EXPRESSION, 'The expression is too long.', 'Biểu thức quá dài.');
    const tokens = expandNames(tokenize(source), new Set(parameters), new Set(variables));
    let pos = 0;
    const peek = () => tokens[pos]!;
    const next = () => tokens[pos++]!;
    const isOp = (t: Token, v: string) => t.kind === 'op' && t.value === v;
    const startsAtom = (t: Token) => t.kind === 'num' || t.kind === 'name' || isOp(t, '(');

    const expr = (): GraphNode => {
      let left = term();
      while (isOp(peek(), '+') || isOp(peek(), '-')) {
        const op = (next() as { value: '+' | '-' }).value;
        left = { type: 'bin', op, left, right: term() };
      }
      return left;
    };
    const term = (): GraphNode => {
      let left = unary();
      for (;;) {
        if (isOp(peek(), '*') || isOp(peek(), '/')) {
          const op = (next() as { value: '*' | '/' }).value;
          left = { type: 'bin', op, left, right: unary() };
        } else if (startsAtom(peek())) {
          left = { type: 'bin', op: '*', left, right: unary() };
        } else {
          return left;
        }
      }
    };
    const unary = (): GraphNode => {
      if (isOp(peek(), '-')) {
        next();
        return { type: 'neg', arg: unary() };
      }
      if (isOp(peek(), '+')) {
        next();
        return unary();
      }
      return power();
    };
    const power = (): GraphNode => {
      const base = atom();
      if (isOp(peek(), '^')) {
        next();
        return { type: 'bin', op: '^', left: base, right: unary() };
      }
      return base;
    };
    const atom = (): GraphNode => {
      const token = next();
      if (token.kind === 'num') return { type: 'num', value: token.value };
      if (token.kind === 'name') {
        const fn = GRAPH_FUNCTIONS.find((f) => f === token.value);
        if (fn) {
          if (!isOp(peek(), '(')) fail(peek().at, `Write ${fn}( … ) with brackets.`, `Viết ${fn}( … ) có ngoặc.`);
          next();
          const arg = expr();
          if (!isOp(next(), ')')) fail(tokens[pos - 1]!.at, 'Missing ")".', 'Thiếu dấu ")".');
          return { type: 'call', fn, arg };
        }
        if (token.value === 'pi') return { type: 'num', value: Math.PI };
        if (token.value === 'e') return { type: 'num', value: Math.E };
        return { type: 'var', name: token.value };
      }
      if (isOp(token, '(')) {
        const inner = expr();
        if (!isOp(next(), ')')) fail(tokens[pos - 1]!.at, 'Missing ")".', 'Thiếu dấu ")".');
        return inner;
      }
      return token.kind === 'end'
        ? fail(token.at, 'The expression ends too early.', 'Biểu thức bị thiếu ở cuối.')
        : fail(token.at, 'Something is missing here.', 'Thiếu số hoặc biến ở đây.');
    };

    const ast = expr();
    if (peek().kind !== 'end') fail(peek().at, 'Unexpected symbol.', 'Có ký hiệu thừa.');
    return { ok: true, ast };
  } catch (error) {
    if (error instanceof ParseError) return { ok: false, error: error.detail };
    throw error;
  }
}

/** Single-letter names in the text that still need declaring as parameters, in order of use. */
export function undeclaredNames(source: string, parameters: readonly string[], variables: readonly string[] = ['x']): string[] {
  const found: string[] = [];
  for (const match of source.toLowerCase().matchAll(/[a-z]+/g)) {
    let rest = match[0];
    while (rest) {
      const word = GRAPH_FUNCTIONS.find((f) => rest.startsWith(f)) ?? (rest.startsWith('pi') ? 'pi' : rest[0]!);
      if (word.length === 1 && word !== 'e' && !variables.includes(word) && !parameters.includes(word) && !found.includes(word)) found.push(word);
      rest = rest.slice(word.length);
    }
  }
  return found;
}

/** Parameter names an expression uses, in first-use order (the variables excluded). */
export function graphNames(ast: GraphNode, variables: readonly string[] = ['x']): string[] {
  const names: string[] = [];
  const walk = (node: GraphNode) => {
    if (node.type === 'var' && !variables.includes(node.name) && !names.includes(node.name)) names.push(node.name);
    if (node.type === 'neg' || node.type === 'call') walk(node.arg);
    if (node.type === 'bin') {
      walk(node.left);
      walk(node.right);
    }
  };
  walk(ast);
  return names;
}

const FUNCTIONS: Record<GraphFunction, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  log: Math.log10,
  ln: Math.log,
  exp: Math.exp,
};

/** f(x) with the given parameter values; null where f is undefined (a gap in the plot). */
export function evaluateGraph(ast: GraphNode, x: number, parameters: Readonly<Record<string, number>> = {}): number | null {
  return evaluateGraphAt(ast, { ...parameters, x });
}

/** The value with every variable and parameter taken from `scope`; null where undefined or a name is missing. */
export function evaluateGraphAt(ast: GraphNode, scope: Readonly<Record<string, number>>): number | null {
  const run = (node: GraphNode): number => {
    switch (node.type) {
      case 'num':
        return node.value;
      case 'var':
        return scope[node.name] ?? Number.NaN;
      case 'neg':
        return -run(node.arg);
      case 'call':
        return FUNCTIONS[node.fn](run(node.arg));
      case 'bin': {
        const a = run(node.left);
        const b = run(node.right);
        if (node.op === '+') return a + b;
        if (node.op === '-') return a - b;
        if (node.op === '*') return a * b;
        if (node.op === '/') return a / b;
        return a ** b;
      }
    }
  };
  const value = run(ast);
  return Number.isFinite(value) ? value : null;
}
