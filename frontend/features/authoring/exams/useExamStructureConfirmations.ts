import { useLanguage } from '@scipal/hooks';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

export function useExamStructureConfirmations() {
  const { t } = useLanguage();
  const { ask, dialog } = useConfirmDialog();
  const cancelLabel = t({ en: 'Cancel', vi: 'Hủy' });

  return {
    dialog,
    askFormatChange: () => ask({
      title: t({ en: 'Change the exam structure?', vi: 'Đổi cấu trúc đề?' }),
      description: t({
        en: 'Changing the structure removes the shared passages and merges the question groups. Change it anyway?',
        vi: 'Đổi cấu trúc sẽ bỏ các đoạn văn dùng chung và gộp các nhóm câu. Bạn vẫn muốn đổi?',
      }),
      cancelLabel,
      confirmLabel: t({ en: 'Change structure', vi: 'Đổi cấu trúc' }),
      destructive: true,
    }),
    askUnassignedSave: (count: number) => ask({
      title: t({ en: 'Save with unassigned questions?', vi: 'Lưu đề khi còn câu chưa xếp?' }),
      description: t({
        en: count + ' question(s) are not in any section. Saving now leaves them out of the exam. Save anyway?',
        vi: 'Còn ' + count + ' câu chưa xếp vào phần nào. Lưu lúc này sẽ bỏ các câu đó khỏi đề. Bạn vẫn muốn lưu?',
      }),
      cancelLabel,
      confirmLabel: t({ en: 'Save anyway', vi: 'Vẫn lưu' }),
      destructive: true,
    }),
    askDeleteExam: () => ask({
      title: t({ en: 'Delete this exam?', vi: 'Xóa đề này?' }),
      description: t({ en: 'Its questions stay in the bank.', vi: 'Các câu hỏi vẫn còn trong ngân hàng.' }),
      cancelLabel,
      confirmLabel: t({ en: 'Delete exam', vi: 'Xóa đề' }),
      destructive: true,
    }),
    askRemoveGroup: () => ask({
      title: t({ en: 'Remove this group and its passage?', vi: 'Bỏ nhóm này cùng đoạn văn?' }),
      description: t({
        en: 'Its questions move to the group next to it.',
        vi: 'Các câu của nhóm sẽ chuyển sang nhóm bên cạnh.',
      }),
      cancelLabel,
      confirmLabel: t({ en: 'Remove group', vi: 'Bỏ nhóm' }),
      destructive: true,
    }),
  };
}
