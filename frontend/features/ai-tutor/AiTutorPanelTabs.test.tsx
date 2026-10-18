// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiTutorPanel } from './AiTutorPanel';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));
vi.mock('./TutorChat', () => ({ TutorChat: () => <div>tutor-chat</div> }));
vi.mock('@/features/community/CommunityMini', () => ({ CommunityMini: () => <div>community-mini</div> }));
vi.mock('next/dynamic', () => ({ default: (load: () => Promise<unknown>) => { void load; return () => <div>community-mini</div>; } }));

afterEach(cleanup);

describe('AiTutorPanel tabs', () => {
  it('offers the community tab to a signed-in reader, loading it only once opened', () => {
    render(<AiTutorPanel level="upper_secondary" signedIn onClose={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Giáo sư AI' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByText('community-mini')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Cộng đồng' }));
    expect(screen.getByText('community-mini')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Mở trang Cộng đồng' }).getAttribute('href')).toBe('/community');
    fireEvent.click(screen.getByRole('tab', { name: 'Giáo sư AI' }));
    expect(screen.getByRole('link', { name: 'Mở ở trang Giáo sư AI' })).toBeTruthy();
  });

  it('shows no tabs to a visitor who is not signed in', () => {
    render(<AiTutorPanel level="upper_secondary" signedIn={false} onClose={() => {}} />);
    expect(screen.queryByRole('tab')).toBeNull();
  });
});
