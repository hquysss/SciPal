import { notFound } from 'next/navigation';
import { THEME_LEVELS, THEME_MODES } from '@scipal/ui';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ThemePreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
      {THEME_LEVELS.map((level) =>
        THEME_MODES.map((mode) => (
          <section
            key={`${level}-${mode}`}
            data-level={level}
            data-theme={mode}
            aria-label={`${level} ${mode}`}
            className="flex flex-col gap-4 rounded-xl bg-paper p-6 text-ink"
          >
            <h2 className="text-xl font-semibold">
              {level} / {mode}
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button>Lưu thay đổi</Button>
              <Button variant="outline">Xem trước</Button>
              <Button variant="secondary">Nháp</Button>
              <Button variant="ghost">Bỏ qua</Button>
              <Button variant="destructive">Xoá bài</Button>
              <Button variant="link">Mở từ điển</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Đang học</Badge>
              <Badge variant="secondary">Lớp 10</Badge>
              <Badge variant="outline">Tin học</Badge>
              <Badge variant="success">Đã hoàn thành</Badge>
              <Badge variant="warning">Đang biên soạn</Badge>
              <Badge variant="destructive">Bị từ chối</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Bài 3. Thuật toán tìm kiếm</CardTitle>
                  <CardDescription>Tìm kiếm tuần tự và nhị phân</CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={40} aria-label="Tiến độ bài học" />
                </CardContent>
              </Card>
              <Field id={`code-${level}-${mode}`} label="Mã lớp" description="6 ký tự" error="Mã lớp không tồn tại">
                {(control) => <Input {...control} placeholder="VD: 4KQ9TZ" />}
              </Field>
            </div>
            <Alert tone="danger" title="Không lưu được bài">
              Kiểm tra kết nối rồi bấm Lưu thay đổi lần nữa.
            </Alert>
            <Alert tone="success">Đã lưu bài.</Alert>
            <EmptyState title="Chưa có lớp nào" description="Tạo lớp để mời học sinh bằng mã 6 ký tự." action={<Button>Tạo lớp</Button>} />
            <Table label="Danh sách học sinh">
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>XP</TableHead>
                  <TableHead>Bài đã học</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Nguyễn Minh An</TableCell>
                  <TableCell>1 240</TableCell>
                  <TableCell>12</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>
        )),
      )}
    </main>
  );
}
