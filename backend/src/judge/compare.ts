/** Output equality as an online judge reads it: line endings, trailing spaces and trailing blank lines do not matter. */
const lines = (text: string) => {
  const rows = text.replace(/\r\n?/g, '\n').split('\n').map((row) => row.replace(/[ \t]+$/, ''));
  while (rows.length > 0 && rows[rows.length - 1] === '') rows.pop();
  return rows;
};

export function outputsMatch(actual: string, expected: string): boolean {
  const a = lines(actual);
  const e = lines(expected);
  return a.length === e.length && a.every((row, i) => row === e[i]);
}
