"""Record the line-by-line run of a small Python lesson program as `code-trace` steps.

    python code_trace.py file.py [--input a --input b]   # JSON on stdout
    python code_trace.py --selftest

The program runs in a child process (5 s limit) under sys.settrace; only lines of the lesson
code are recorded. Output shape: docs/superpowers/specs/2026-10-16-code-trace-tin10-design.md.
"""
import builtins
import json
import multiprocessing
import sys
import types

MAX_STEPS = 500
MAX_ITEMS = 30
TIMEOUT = 5
FILENAME = '<lesson>'


class _Stop(Exception):
    """Raised inside the traced program when the step budget is used up."""


def _snapshot(value):
    entry = {'repr': repr(value)}
    if isinstance(value, (list, tuple, str)):
        items = [repr(v) for v in list(value)[:MAX_ITEMS]]
        if len(value) > MAX_ITEMS:
            items.append('…')
        entry['items'] = items
    return entry


def _visible(name, value):
    return not name.startswith('__') and not isinstance(value, (types.FunctionType, types.ModuleType, type))


def _frames(frame):
    chain = []
    while frame is not None:
        if frame.f_code.co_filename == FILENAME:
            name = '<module>' if frame.f_code.co_name == '<module>' else frame.f_code.co_name
            variables = {k: _snapshot(v) for k, v in frame.f_locals.items() if _visible(k, v)}
            chain.append({'name': name, 'vars': variables})
        frame = frame.f_back
    return list(reversed(chain))


def _run(code, inputs, queue):
    steps = []
    out = []
    remaining = list(inputs)

    def flush():
        text = ''.join(out)
        out.clear()
        return text

    class Writer:
        def write(self, text):
            out.append(text)
            return len(text)

        def flush(self):
            pass

    def fake_input(prompt=''):
        out.append(str(prompt))
        if not remaining:
            raise EOFError('EOF when reading a line')
        value = remaining.pop(0)
        out.append(value + '\n')
        return value

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != FILENAME:
            return None
        if event == 'line':
            if len(steps) >= MAX_STEPS:
                raise _Stop()
            step = {'line': frame.f_lineno, 'frames': _frames(frame)}
            text = flush()
            if steps and text:
                steps[-1]['out'] = steps[-1].get('out', '') + text
            steps.append(step)
        return tracer

    result = {'code': code, 'input': list(inputs), 'steps': steps}
    old_stdout = sys.stdout
    sys.stdout = Writer()
    builtins_input = builtins.input
    builtins.input = fake_input
    try:
        compiled = compile(code, FILENAME, 'exec')
    except SyntaxError as e:
        sys.stdout = old_stdout
        queue.put({'syntax_error': f'{type(e).__name__}: {e.msg} (line {e.lineno})'})
        return
    sys.settrace(tracer)
    error = None
    try:
        exec(compiled, {'__name__': '__lesson__'})
    except _Stop:
        result['truncated'] = True
    except BaseException as e:  # the lesson program's own error is data, not ours
        tb = e.__traceback__
        line = None
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == FILENAME:
                line = tb.tb_lineno
            tb = tb.tb_next
        error = (f'{type(e).__name__}: {e}', line)
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout
        builtins.input = builtins_input
    text = flush()
    if text:
        if steps:
            steps[-1]['out'] = steps[-1].get('out', '') + text
        else:
            steps.append({'line': 1, 'frames': [{'name': '<module>', 'vars': {}}], 'out': text})
    if error is not None:
        message, line = error
        last = steps[-1] if steps else None
        if last is not None and (line is None or last['line'] == line):
            last['error'] = message
        else:
            frames = last['frames'] if last else [{'name': '<module>', 'vars': {}}]
            steps.append({'line': line or 1, 'frames': frames, 'error': message})
    queue.put(result)


def trace(code, inputs=()):
    queue = multiprocessing.Queue()
    child = multiprocessing.Process(target=_run, args=(code, list(inputs), queue))
    child.start()
    child.join(TIMEOUT)
    if child.is_alive():
        child.terminate()
        child.join()
        raise TimeoutError(f'program ran longer than {TIMEOUT} s')
    result = queue.get(timeout=2)
    if 'syntax_error' in result:
        raise SyntaxError(result['syntax_error'])
    return result


def _selftest():
    def last_vars(r, name=None):
        frames = r['steps'][-1]['frames']
        frame = frames[-1] if name is None else next(f for f in frames if f['name'] == name)
        return frame['vars']

    r = trace('s = 0\ns = s + 5\nt = s\n')
    assert r['steps'][-1]['frames'][0]['vars']['s']['repr'] == '5', r

    r = trace('for i in range(3):\n    x = i\n')
    assert sum(1 for s in r['steps'] if s['line'] == 2) == 3, r

    r = trace('def f(a):\n    b = a * 2\n    return b\nz = f(3)\n')
    inside = [s for s in r['steps'] if s['frames'][-1]['name'] == 'f' and 'b' in s['frames'][-1]['vars']]
    assert inside and inside[-1]['frames'][-1]['vars']['b']['repr'] == '6', r

    r = trace('x = 1\ndef f():\n    x = 2\n    return x\nf()\n')
    both = [s for s in r['steps'] if len(s['frames']) == 2 and 'x' in s['frames'][-1]['vars']]
    assert both and both[-1]['frames'][0]['vars']['x']['repr'] == '1' and both[-1]['frames'][-1]['vars']['x']['repr'] == '2', r

    r = trace("x = input('n? ')\nprint(x)\n", ['7'])
    assert ''.join(s.get('out', '') for s in r['steps']) == 'n? 7\n7\n', r

    r = trace('print(1)\nprint(1/0)\n')
    assert r['steps'][-1]['error'] == 'ZeroDivisionError: division by zero' and r['steps'][-1]['line'] == 2, r

    r = trace('while True:\n    pass\n')
    assert len(r['steps']) == 500 and r['truncated'] is True, r

    r = trace("a = input()\nb = input()\n", ['1'])
    assert r['steps'][-1]['error'].startswith('EOFError'), r

    r = trace("l = [1, 2]\ns = 'ab'\nend = 0\n")
    v = r['steps'][-1]['frames'][0]['vars']
    assert v['l']['items'] == ['1', '2'] and v['s']['items'] == ["'a'", "'b'"], v

    try:
        trace('def (:\n')
        raise AssertionError('syntax error not reported')
    except SyntaxError:
        pass
    print('ok')


def main(argv):
    if argv == ['--selftest']:
        return _selftest()
    path, inputs, i = None, [], 0
    while i < len(argv):
        if argv[i] == '--input':
            inputs.append(argv[i + 1])
            i += 2
        else:
            path = argv[i]
            i += 1
    if path is None:
        sys.exit('usage: python code_trace.py file.py [--input value ...]')
    with open(path, encoding='utf-8') as f:
        code = f.read()
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps(trace(code, inputs), ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1:])
