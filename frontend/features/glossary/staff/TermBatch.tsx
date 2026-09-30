'use client';

import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { createTerms, type SubjectOption } from './api';
import {
  EMPTY_ROW, MAX_SHEET_ROWS, SHEET_COLUMNS, SheetError, cellsFromText, createTermTemplate, isBlank, rowProblem, rowsFromCells, rowsFromFile, type SheetRow,
} from './termSheet';

// Many terms in one go: paste from Excel, open a .xlsx/.csv file, or type row by row, check the
// table, then save them all. Saved rows leave the table; rows the server refused stay with the reason.

type Bilingual = { en: string; vi: string };
type Row = SheetRow & { key: number; error?: Bilingual };

const CELL =
  'w-full min-w-40 rounded-md border border-edge bg-surface px-2 py-1.5 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';
const SELECT =
  'min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:max-w-xs';

let nextKey = 1;
const row = (values: SheetRow = EMPTY_ROW): Row => ({ ...values, key: nextKey++ });

export function TermBatch({ subjects, isAdmin, onSaved }: { subjects: SubjectOption[]; isAdmin: boolean; onSaved: () => void }) {
  const { t } = useLanguage();
  const [subjectId, setSubjectId] = useState('');
  const [rows, setRows] = useState<Row[]>(() => [row(), row(), row()]);
  const [notice, setNotice] = useState<{ tone: 'danger' | 'success'; text: Bilingual } | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filled = rows.filter((r) => !isBlank(r));
  const problems = filled.filter((r) => rowProblem(r));

  const addRows = (incoming: SheetRow[]) => {
    if (incoming.length === 0) {
      setNotice({ tone: 'danger', text: { vi: 'Không đọc được dòng nào. Kiểm tra lại các cột.', en: 'No rows were read. Check the columns.' } });
      return;
    }
    setRows((current) => {
      const kept = current.filter((r) => !isBlank(r));
      const room = MAX_SHEET_ROWS - kept.length;
      return [...kept, ...incoming.slice(0, Math.max(room, 0)).map((values) => row(values))];
    });
    const over = filled.length + incoming.length - MAX_SHEET_ROWS;
    setNotice({
      tone: over > 0 ? 'danger' : 'success',
      text: over > 0
        ? { vi: `Đã thêm dòng tới giới hạn ${MAX_SHEET_ROWS}; bỏ qua ${over} dòng.`, en: `Rows added up to the ${MAX_SHEET_ROWS} limit; ${over} left out.` }
        : { vi: `Đã đưa ${incoming.length} dòng vào bảng. Kiểm tra rồi bấm lưu.`, en: `${incoming.length} rows are in the table. Check them, then save.` },
    });
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    // A single cell pastes normally; several cells (tabs or lines) fill the table.
    if (!text.includes('\t') && !text.trim().includes('\n')) return;
    e.preventDefault();
    addRows(rowsFromCells(cellsFromText(text)));
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      addRows(await rowsFromFile(file));
    } catch (err) {
      setNotice({ tone: 'danger', text: err instanceof SheetError ? { vi: err.message, en: 'The file could not be read.' } : { vi: 'Không đọc được tệp.', en: 'The file could not be read.' } });
    }
  };

  const downloadTemplate = async () => {
    const buffer = await createTermTemplate();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'scipal-mau-thuat-ngu.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const setCell = (key: number, field: keyof SheetRow, value: string) =>
    setRows((current) => current.map((r) => (r.key === key ? { ...r, [field]: value, error: undefined } : r)));

  const save = async () => {
    if (!subjectId) {
      setNotice({ tone: 'danger', text: { vi: 'Hãy chọn môn học cho các thuật ngữ.', en: 'Choose a subject for the terms.' } });
      return;
    }
    if (filled.length === 0 || problems.length > 0) {
      setNotice({ tone: 'danger', text: { vi: 'Sửa các dòng được đánh dấu trước khi lưu.', en: 'Fix the marked rows before saving.' } });
      return;
    }
    setSending(true);
    const result = await createTerms(filled.map(({ key: _key, error: _error, ...values }) => ({ ...values, subject_id: subjectId })));
    setSending(false);
    if (!result.ok) {
      setNotice({ tone: 'danger', text: result.error });
      return;
    }
    const failed = new Map(result.data.results.flatMap((r) => (r.ok ? [] : [[r.index, { vi: r.error, en: r.error_en }] as const])));
    const left = filled.flatMap((r, i) => (failed.has(i) ? [{ ...r, error: failed.get(i) }] : []));
    setRows(left.length ? left : [row(), row(), row()]);
    const saved = result.data.saved;
    setNotice({
      tone: left.length ? 'danger' : 'success',
      text: {
        vi: `${isAdmin ? 'Đã thêm' : 'Đã gửi duyệt'} ${saved} thuật ngữ.${left.length ? ` ${left.length} dòng chưa lưu, xem lý do ở từng dòng.` : ''}`,
        en: `${isAdmin ? 'Added' : 'Sent for review'} ${saved} terms.${left.length ? ` ${left.length} rows were not saved; see each row.` : ''}`,
      },
    });
    if (saved > 0) onSaved();
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="batch-subject" className="text-sm font-semibold text-ink">{t({ en: 'Subject for every row', vi: 'Môn học cho mọi dòng' })}</label>
        <select id="batch-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={SELECT}>
          <option value="">{t({ en: 'Choose a subject…', vi: 'Chọn môn…' })}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{t({ en: s.name_en, vi: s.name_vi })}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} className={buttonVariants({ variant: 'outline' })}>
          <FileSpreadsheet aria-hidden="true" />
          {t({ en: 'Open Excel / CSV file', vi: 'Mở tệp Excel / CSV' })}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.csv,.tsv,.txt" onChange={onFile} className="sr-only" tabIndex={-1} aria-hidden="true" />
        <button type="button" onClick={() => void downloadTemplate()} className={buttonVariants({ variant: 'ghost' })}>
          <Download aria-hidden="true" />
          {t({ en: 'Template', vi: 'Tải bảng mẫu' })}
        </button>
        <span className="text-sm text-ink-muted">
          {t({ en: 'Or copy cells in Excel and paste them into the table.', vi: 'Hoặc copy các ô trong Excel rồi dán vào bảng.' })}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line" onPaste={onPaste}>
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{t({ en: 'Terms to add', vi: 'Thuật ngữ sẽ thêm' })}</caption>
          <thead className="bg-surface-sunken">
            <tr>
              <th scope="col" className="w-10 px-2 py-2 text-xs font-bold text-ink-muted">#</th>
              {SHEET_COLUMNS.map((c) => (
                <th key={c.key} scope="col" className="px-2 py-2 text-xs font-bold text-ink-muted">
                  {c.header}{c.key.startsWith('term') || c.key.startsWith('definition') ? ' *' : ''}
                </th>
              ))}
              <th scope="col" className="w-12 px-2 py-2"><span className="sr-only">{t({ en: 'Remove', vi: 'Xoá' })}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const problem = r.error ?? (!isBlank(r) ? rowProblem(r) : null);
              return (
                <tr key={r.key} className={`border-t border-line align-top ${problem ? 'bg-danger-surface' : ''}`}>
                  <td className="px-2 py-2 text-sm tabular-nums text-ink-muted">{i + 1}</td>
                  {SHEET_COLUMNS.map((c) => {
                    const long = c.key.startsWith('definition') || c.key.startsWith('example');
                    const label = `${c.header}, ${t({ en: 'row', vi: 'dòng' })} ${i + 1}`;
                    return (
                      <td key={c.key} className="px-1 py-1.5">
                        {long ? (
                          <textarea aria-label={label} rows={2} value={r[c.key]} onChange={(e) => setCell(r.key, c.key, e.target.value)} className={`${CELL} min-w-56 resize-y`} />
                        ) : (
                          <input aria-label={label} value={r[c.key]} onChange={(e) => setCell(r.key, c.key, e.target.value)} className={CELL} />
                        )}
                        {c.key === 'term_vi' && problem && <p className="mt-1 text-xs font-semibold text-danger">{t(problem)}</p>}
                      </td>
                    );
                  })}
                  <td className="px-1 py-1.5">
                    <button
                      type="button"
                      onClick={() => setRows((current) => (current.length > 1 ? current.filter((x) => x.key !== r.key) : [row()]))}
                      aria-label={`${t({ en: 'Remove row', vi: 'Xoá dòng' })} ${i + 1}`}
                      className="grid h-9 w-9 place-items-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setRows((current) => (current.length < MAX_SHEET_ROWS ? [...current, row()] : current))}
          className={buttonVariants({ variant: 'outline' })}
        >
          <Plus aria-hidden="true" />
          {t({ en: 'Add a row', vi: 'Thêm dòng' })}
        </button>
        <button type="button" onClick={() => void save()} disabled={sending || filled.length === 0} className={buttonVariants()}>
          {sending
            ? t({ en: 'Saving…', vi: 'Đang lưu…' })
            : isAdmin
              ? t({ en: `Add ${filled.length} terms`, vi: `Thêm ${filled.length} thuật ngữ` })
              : t({ en: `Send ${filled.length} terms for review`, vi: `Gửi ${filled.length} thuật ngữ cho admin duyệt` })}
        </button>
        {problems.length > 0 && (
          <span className="text-sm font-semibold text-danger">{t({ en: `${problems.length} rows need fixing`, vi: `${problems.length} dòng cần sửa` })}</span>
        )}
      </div>

      {notice && (
        <div role="status">
          <Alert tone={notice.tone}>{t(notice.text)}</Alert>
        </div>
      )}
    </div>
  );
}
