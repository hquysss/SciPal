import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { Alert } from './alert';
import { EmptyState } from './empty-state';
import { Field } from './field';
import { Input } from './input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

describe('Field + Input', () => {
  it('links description and error to the control and marks it invalid', () => {
    const html = renderToStaticMarkup(
      <Field id="class-code" label="Mã lớp" description="6 ký tự" error="Mã lớp không tồn tại">
        {(control) => <Input {...control} />}
      </Field>,
    );
    expect(html).toContain('for="class-code"');
    expect(html).toContain('id="class-code"');
    expect(html).toContain('aria-describedby="class-code-description class-code-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('id="class-code-error"');
    expect(html).toContain('text-danger');
    expect(countRawColors(html).total).toBe(0);
  });

  it('omits aria attributes when there is nothing to describe', () => {
    const html = renderToStaticMarkup(<Field id="name" label="Tên">{(control) => <Input {...control} />}</Field>);
    expect(html).not.toContain('aria-describedby');
    expect(html).not.toContain('aria-invalid');
  });

  it('gives the input a 44px target and an edge border', () => {
    const html = renderToStaticMarkup(<Input id="x" />);
    expect(html).toContain('min-h-11');
    expect(html).toContain('border-edge');
  });
});

describe('Alert', () => {
  it('announces danger immediately and other tones politely', () => {
    expect(renderToStaticMarkup(<Alert tone="danger">Không lưu được bài.</Alert>)).toContain('role="alert"');
    expect(renderToStaticMarkup(<Alert tone="success">Đã lưu bài.</Alert>)).toContain('role="status"');
  });

  it.each(['info', 'success', 'warning', 'danger'] as const)('%s has an icon and tokens only', (tone) => {
    const html = renderToStaticMarkup(<Alert tone={tone} title="Tiêu đề">Nội dung</Alert>);
    expect(html).toContain('<svg');
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('EmptyState', () => {
  it('shows the title, description and next action', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Chưa có lớp nào" description="Tạo lớp để mời học sinh." action={<a href="/teacher/classes">Tạo lớp</a>} />,
    );
    expect(html).toContain('Chưa có lớp nào');
    expect(html).toContain('Tạo lớp');
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('Table', () => {
  it('is a labelled, keyboard-scrollable region with column headers', () => {
    const html = renderToStaticMarkup(
      <Table label="Danh sách học sinh">
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>An</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Danh sách học sinh"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('scope="col"');
    expect(countRawColors(html).total).toBe(0);
  });
});
