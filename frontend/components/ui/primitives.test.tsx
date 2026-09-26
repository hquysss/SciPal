import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Progress } from './progress';
import { Separator } from './separator';

const TAILWIND_V4_ONLY = /gap-\(|py-\(|px-\(|p-\(|--spacing\(|data-horizontal:|data-vertical:|ring-3|rounded-4xl|\bin-data-/;

function expectTokensOnly(html: string) {
  expect(countRawColors(html).total).toBe(0);
  expect(html).not.toMatch(TAILWIND_V4_ONLY);
}

describe('Button', () => {
  it.each(['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const)('%s uses tokens only', (variant) => {
    expectTokensOnly(renderToStaticMarkup(<Button variant={variant}>Lưu thay đổi</Button>));
  });

  it('meets the 44px target and shows keyboard focus', () => {
    const html = renderToStaticMarkup(<Button>Lưu thay đổi</Button>);
    expect(html).toContain('min-h-11');
    expect(html).toContain('focus-visible:outline-focus');
    expect(html).toContain('bg-action');
    expect(html).toContain('text-action-ink');
  });
});

describe('Badge', () => {
  it.each(['default', 'secondary', 'outline', 'success', 'warning', 'destructive'] as const)('%s uses tokens only', (variant) => {
    expectTokensOnly(renderToStaticMarkup(<Badge variant={variant}>Đang biên soạn</Badge>));
  });
});

describe('Card', () => {
  it('uses surface, line and muted ink', () => {
    const html = renderToStaticMarkup(
      <Card>
        <CardHeader>
          <CardTitle>Bài 3</CardTitle>
          <CardDescription>Thuật toán tìm kiếm</CardDescription>
        </CardHeader>
        <CardContent>Nội dung</CardContent>
        <CardFooter>Chân thẻ</CardFooter>
      </Card>,
    );
    expectTokensOnly(html);
    expect(html).toContain('bg-surface');
    expect(html).toContain('border-line');
    expect(html).toContain('text-ink-muted');
  });
});

describe('Progress and Separator', () => {
  it('use tokens only', () => {
    expectTokensOnly(renderToStaticMarkup(<Progress value={40} aria-label="Tiến độ" />));
    const vertical = renderToStaticMarkup(<Separator orientation="vertical" />);
    expectTokensOnly(vertical);
    expect(vertical).toContain('w-px');
    expect(renderToStaticMarkup(<Separator />)).toContain('h-px');
  });
});
