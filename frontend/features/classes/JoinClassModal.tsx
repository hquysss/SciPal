'use client';

import { useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface JoinClassModalProps {
  open: boolean;
  onClose: () => void;
  onJoined: (classId: string) => void;
  token?: string;
}

export function JoinClassModal({ open, onClose, onJoined, token }: JoinClassModalProps) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

    try {
      const res = await fetch(`${API_BASE}/api/classes/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ invite_code: code.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        onJoined(data.class_id);
        setCode('');
        onClose();
        return;
      }
      const errData = await res.json().catch(() => ({}));
      setError(errData.error ?? t({ en: 'This class code is invalid or has expired.', vi: 'Mã lớp không hợp lệ hoặc đã hết hạn.' }));
    } catch (err) {
      console.warn('Join class error:', err);
      setError(t({
        en: 'Could not reach the server. You have not joined the class yet.',
        vi: 'Không kết nối được máy chủ. Bạn chưa vào lớp.',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t({ en: 'Join a class', vi: 'Tham gia lớp học' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })} className="max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}

        <Field
          id="join-class-code"
          label={t({ en: 'Class code (6 characters)', vi: 'Mã lớp học (6 ký tự)' })}
          description={t({ en: 'Ask your teacher for the code.', vi: 'Nhận mã tham gia từ thầy cô phụ trách lớp.' })}
        >
          {(control) => (
            <Input
              {...control}
              required
              maxLength={6}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="A1B2C3"
              className="text-center font-mono text-xl tracking-widest"
            />
          )}
        </Field>

        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t({ en: 'Cancel', vi: 'Hủy' })}
          </Button>
          <Button type="submit" disabled={loading || code.trim().length < 4}>
            {loading ? t({ en: 'Joining…', vi: 'Đang vào…' }) : t({ en: 'Join class', vi: 'Vào lớp' })}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
