'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, CreditCard, QrCode, RefreshCcw, ShieldCheck, Wallet } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { BillingAccount } from '@scipal/types';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { cancelRenewal, fetchMyPlan, formatVnd, startCheckout, type Catalog } from './billingApi';
import { INTERVAL_NOUN, canAutoRenew } from './intervals';
type Provider = 'payos' | 'vnpay' | 'momo';
type Props = {
 readonly context?: { readonly audience?: string; readonly interval?: string; readonly plan?: string };
 readonly catalog: Catalog | null;
 /** Starts checkout for the plan chosen on /pricing; set only by the page wrapper. */
 readonly onBuy?: (provider: Provider, autoRenew: boolean) => void;
 readonly buying?: boolean;
 readonly buyError?: { en: string; vi: string } | null;
 readonly account: BillingAccount | null;
 readonly accountStatus: 'loading' | 'ready' | 'error';
 readonly onCancel?: () => void;
 readonly onRetry?: () => void;
 readonly cancelling?: boolean;
 readonly message?: { en: string; vi: string } | null;
};
const providers = [
 { id: 'payos', name: 'payOS', icon: QrCode, type: { en: 'BANK TRANSFER', vi: 'CHUYỂN KHOẢN' }, description: { en: 'Scan VietQR in your banking app. Pay for one period at a time.', vi: 'Quét VietQR trong ứng dụng ngân hàng. Thanh toán riêng từng kỳ.' } },
 { id: 'vnpay', name: 'VNPAY', icon: CreditCard, type: { en: 'PAYMENT GATEWAY', vi: 'CỔNG THANH TOÁN' }, description: { en: 'Choose a supported payment method on VNPAY. Auto-renewal is optional.', vi: 'Chọn phương thức được hỗ trợ trên VNPAY. Có thể chọn tự gia hạn.' } },
 { id: 'momo', name: 'MoMo', icon: Wallet, type: { en: 'E-WALLET', vi: 'VÍ ĐIỆN TỬ' }, description: { en: 'Authorize recurring payments in MoMo. You choose the amount and period.', vi: 'Ủy quyền thu định kỳ trong MoMo. Bạn đồng ý rõ số tiền và chu kỳ.' } },
] as const;
export function PaymentMethodsView({ catalog, account, accountStatus, onCancel, onRetry, cancelling = false, message, context, onBuy, buying = false, buyError }: Props) {
 const { t, lang } = useLanguage();
 const available = { payos: catalog?.payosCheckoutOpen === true, vnpay: catalog?.vnpayCheckoutOpen === true, momo: catalog?.momoAutoRenewOpen === true };
 const [selected, setSelected] = useState<Provider | null>(available.payos ? 'payos' : available.vnpay ? 'vnpay' : available.momo ? 'momo' : null);
 const [renew, setRenew] = useState(false);
 const chosenPlan = context?.plan ? catalog?.plans.find((plan) => plan.code === context.plan && plan.prices.length > 0) : undefined;
 const chosenPrice = chosenPlan?.prices.find((price) => price.interval === context?.interval);
 // MoMo is subscription-only and VNPAY renewal is optional; 3- and 6-month plans are paid once.
 const renewable = chosenPrice ? canAutoRenew(chosenPrice.interval) : true;
 const offered = (id: Provider) => available[id] && (id !== 'momo' || renewable);
 const renewAvailable = selected === 'momo' ? true : selected === 'vnpay' && catalog?.vnpayAutoRenewOpen === true;
 const needsConsent = selected === 'momo';
 const roleBlocks = Boolean(chosenPlan && account && account.role !== chosenPlan.audience);
 const wantsRenew = selected === 'momo' || (renew && renewAvailable && renewable);
 const pricingQuery = new URLSearchParams(selected ? { provider: selected } : {});
 if (context?.audience) pricingQuery.set('audience', context.audience);
 if (context?.interval) pricingQuery.set('interval', context.interval);
 const method = providers.find((provider) => provider.id === selected);
 const renewal = account?.renewal;
 const currentProvider = renewal?.provider === 'vnpay' ? 'VNPAY' : 'MoMo';
 const activeRenewal = renewal && renewal.status !== 'manual' && renewal.status !== 'cancelled';
 const mayCancel = activeRenewal && (renewal.status === 'active' || renewal.status === 'cancel_pending' || renewal.provider === 'vnpay');
 const status = renewal?.status === 'cancel_pending' ? { vi: `Đang chờ ${currentProvider} xác nhận hủy`, en: `Waiting for ${currentProvider} to confirm cancellation` }
  : renewal?.status === 'active' ? { vi: `Đang tự gia hạn qua ${currentProvider}`, en: `${currentProvider} auto-renewal is on` }
  : renewal?.status === 'pending' ? { vi: `Đang xử lý đăng ký ${currentProvider}`, en: `${currentProvider} registration is pending` }
  : { vi: `Gia hạn ${currentProvider} đang tạm dừng`, en: `${currentProvider} renewal is paused` };
 const date = (value: string) => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'vi-VN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
 return <div className="flex flex-col gap-6">
  {!catalog && <Alert tone="danger"><p>{t({ vi: 'Chưa tải được các cổng thanh toán. Thử lại sau nhé.', en: 'Payment providers could not be loaded. Try again later.' })}</p>{onRetry && <button type="button" onClick={onRetry} className={buttonVariants({ variant: 'outline' })}>{t({ vi: 'Thử lại', en: 'Try again' })}</button>}</Alert>}
  <fieldset className="min-w-0">
   <legend className="mb-4 text-sm font-semibold text-ink">{t({ vi: 'Chọn cổng cho lần thanh toán tiếp theo', en: 'Choose a provider for your next payment' })}</legend>
   <div className="grid gap-3 md:grid-cols-3">
    {providers.map((provider) => {
     const checked = selected === provider.id && offered(provider.id);
     const Icon = provider.icon;
     return <label key={provider.id} className={`relative flex min-w-0 flex-col gap-4 rounded-2xl border p-5 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus ${checked ? 'border-action bg-surface' : 'border-edge bg-surface'} ${offered(provider.id) ? 'cursor-pointer hover:bg-surface-sunken' : 'text-ink-muted'}`}>
      <div className="flex items-center justify-between gap-2">
       <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface-sunken text-ink"><Icon size={22} aria-hidden="true" /></span>
       <input type="radio" name="payment-provider" aria-label={provider.name} value={provider.id} checked={checked} disabled={!offered(provider.id)} onChange={() => { setSelected(provider.id); setRenew(false); }} className="size-5 accent-action" />
      </div>
      <div><p className="mb-1 text-xs font-medium tracking-wider text-ink-muted">{t(provider.type)}</p><h2 className="text-xl font-extrabold tracking-tight text-ink">{provider.name}</h2></div>
      <p className="text-sm leading-relaxed text-ink-muted">{t(provider.description)}</p>
      <span className={`mt-auto inline-flex items-center gap-1.5 text-xs font-semibold ${offered(provider.id) ? 'text-success' : 'text-ink-muted'}`}>
       {offered(provider.id) && <Check size={14} aria-hidden="true" />}
       {t(!catalog ? {vi:'Chưa tải được trạng thái',en:'Status unavailable'} : offered(provider.id) ? {vi:'Sẵn sàng',en:'Available'} : {vi:'Chưa mở',en:'Not available yet'})}
      </span>
     </label>;
    })}
   </div>
  </fieldset>
  {chosenPlan && chosenPrice && <section className="rounded-2xl border border-line bg-surface p-5" aria-label={t({vi:'Gói đã chọn',en:'Selected plan'})}>
   <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t({vi:'Gói đã chọn',en:'Selected plan'})}</p>
   <p className="mt-1 text-lg font-extrabold text-ink">{t(chosenPlan.name)} · {formatVnd(chosenPrice.amountVnd)} / {t(INTERVAL_NOUN[chosenPrice.interval])}</p>
   <Link href={`/pricing?audience=${chosenPlan.audience}&interval=${chosenPrice.interval}`} className="mt-1 inline-block text-sm font-semibold text-action underline-offset-4 hover:underline">{t({vi:'Đổi gói hoặc chu kỳ',en:'Change plan or period'})}</Link>
  </section>}
  {chosenPlan && !chosenPrice && <Alert tone="danger"><p>{t({vi:'Chu kỳ này không còn bán. Quay lại bảng giá để chọn lại.',en:'This period is no longer sold. Go back to pricing and choose again.'})}</p></Alert>}
  {roleBlocks && <Alert tone="danger"><p>{t(chosenPlan?.audience === 'student' ? {vi:'Gói này dành cho học sinh.',en:'This plan is for students.'} : {vi:'Gói này dành cho giáo viên.',en:'This plan is for teachers.'})}</p></Alert>}
  {buyError && <Alert tone="danger"><p>{t(buyError)}</p></Alert>}
  {chosenPrice && selected && offered(selected) && renewAvailable && renewable && <label className="flex min-h-11 cursor-pointer items-start gap-2 text-sm text-ink-muted">
   <input type="checkbox" checked={renew} onChange={(event) => setRenew(event.currentTarget.checked)} className="mt-1 size-4 shrink-0 accent-action" />
   <span>{t({
    en: `After authorization, ${method?.name} will charge ${formatVnd(chosenPrice.amountVnd)} each ${t(INTERVAL_NOUN[chosenPrice.interval])} for the first period, then each following period. Cancel from My Plan; a charge already in progress may finish.`,
    vi: `Sau khi bạn ủy quyền, ${method?.name} tự thu ${formatVnd(chosenPrice.amountVnd)} mỗi ${t(INTERVAL_NOUN[chosenPrice.interval])} cho kỳ đầu và các kỳ tiếp theo. Bạn có thể hủy trong mục Gói của tôi; lần thu đã bắt đầu có thể hoàn tất.`,
   })}</span>
  </label>}
  <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-sunken p-5 sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
   <div><p className="font-bold text-ink">{method && selected && offered(selected) ? t({vi:`Thanh toán qua ${method.name}`,en:`Pay through ${method.name}`}) : t({vi:'Cổng thanh toán đang được chuẩn bị',en:'Payment providers are being prepared'})}</p>
    <p className="mt-1 text-sm text-ink-muted">{t(selected === 'vnpay' && catalog?.vnpaySandbox ? {vi:'Chế độ thử nghiệm, không thu tiền thật.',en:'Test mode; no real money is charged.'} : selected === 'momo' || (selected === 'vnpay' && catalog?.vnpayAutoRenewOpen) ? {vi:'Có thể tự gia hạn',en:'Optional auto-renewal'} : {vi:'Thanh toán riêng từng kỳ',en:'One payment per period'})}</p>
   </div>
   {method && selected && offered(selected) ? (chosenPlan && chosenPrice && onBuy
     ? <button type="button" onClick={() => onBuy(selected, wantsRenew)} disabled={buying || roleBlocks || (needsConsent && !renew)} aria-busy={buying} className={buttonVariants()}>{buying ? t({vi:'Đang mở thanh toán…',en:'Opening payment…'}) : t(wantsRenew ? {vi:`Tự gia hạn với ${method.name}`,en:`Auto-renew with ${method.name}`} : {vi:`Thanh toán với ${method.name}`,en:`Pay with ${method.name}`})}<ArrowRight size={16} aria-hidden="true" /></button>
     : <Link href={`/pricing?${pricingQuery.toString()}`} className={buttonVariants()}>{t({vi:`Tiếp tục với ${method.name}`,en:`Continue with ${method.name}`})}<ArrowRight size={16} aria-hidden="true" /></Link>) : <button type="button" disabled className={buttonVariants()}>{t({vi:'Chưa mở thanh toán',en:'Checkout is not open yet'})}</button>}
  </section>
  <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
   <div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-bold text-ink"><RefreshCcw size={18} aria-hidden="true" />{t({vi:'Tự gia hạn',en:'Auto-renewal'})}</h2><Link href="/profile/plan" className="text-sm font-semibold text-action underline-offset-4 hover:underline">{t({vi:'Gói của tôi',en:'My plan'})}</Link></div>
   {accountStatus === 'loading' ? <p role="status" className="text-sm text-ink-muted">{t({vi:'Đang kiểm tra trạng thái tự gia hạn…',en:'Checking renewal status…'})}</p>
    : accountStatus === 'error' ? <Alert tone="danger"><p>{t({vi:'Chưa tải được trạng thái tự gia hạn. Thử lại trước khi đổi cổng thanh toán.',en:'Renewal status could not be loaded. Retry before switching providers.'})}</p>{onRetry && <button type="button" onClick={onRetry} className={buttonVariants({variant:'outline'})}>{t({vi:'Thử lại',en:'Try again'})}</button>}</Alert>
    : activeRenewal ? <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-ink">{t(status)}</p>
       {renewal.amountVnd && renewal.interval && <p className="mt-1 text-sm text-ink-muted">{formatVnd(renewal.amountVnd)} / {renewal.interval === 'year' ? t({vi:'năm',en:'year'}) : t({vi:'tháng',en:'month'})}{renewal.nextChargeAt ? ` · ${date(renewal.nextChargeAt)}` : ''}</p>}
       {renewal.status === 'cancel_pending' && <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">{t({vi:'Không bắt đầu kỳ thu mới; lần thu đang xử lý vẫn có thể hoàn tất.',en:'No new charge will start; a charge already in progress may finish.'})}</p>}
       {account?.paidThrough && <p className="mt-2 text-sm text-ink-muted">{t({vi:'Gói đã trả vẫn dùng đến',en:'Paid access remains until'})} {date(account.paidThrough)}</p>}
      </div>{mayCancel && onCancel && <button type="button" onClick={onCancel} disabled={cancelling} aria-busy={cancelling} className={buttonVariants({variant:'outline'})}>{t(cancelling ? {vi:'Đang kiểm tra…',en:'Checking…'} : renewal.status === 'cancel_pending' ? {vi:'Kiểm tra trạng thái hủy',en:'Check cancellation status'} : {vi:'Hủy gia hạn',en:'Cancel renewal'})}</button>}</div>
    : <p className="text-sm leading-relaxed text-ink-muted">{t({vi:'Bạn chưa bật tự gia hạn. Mỗi lần mua gói, bạn chủ động chọn có gia hạn hay không.',en:'Auto-renewal is off. You choose whether to enable it when buying a plan.'})}</p>}
   {message && <p role="status" className="mt-3 text-sm text-ink-muted">{t(message)}</p>}
  </section>
  <div className="flex items-start gap-3 px-1 text-sm leading-relaxed text-ink-muted"><ShieldCheck className="mt-0.5 shrink-0 text-action" size={20} aria-hidden="true" /><p>{t({vi:'Bạn nhập thông tin thanh toán trên trang của nhà cung cấp. SciPal không nhận số thẻ, mã CVV hay mật khẩu ngân hàng.',en:'Enter payment details on the provider’s page. SciPal never receives your card number, CVV or banking password.'})}</p></div>
 </div>;
}
export function PaymentMethods({ catalog, context }: { readonly catalog: Catalog | null; readonly context?: { readonly audience?: string; readonly interval?: string; readonly plan?: string } }) {
 const router = useRouter();
 const [account, setAccount] = useState<BillingAccount | null>(null);
 const [status, setStatus] = useState<Props['accountStatus']>('loading');
 const [cancelling, setCancelling] = useState(false);
 const [message, setMessage] = useState<Props['message']>(null);
 const [buying, setBuying] = useState(false);
 const [buyError, setBuyError] = useState<Props['buyError']>(null);
 // One key per provider and price while the page is open: a double click or a retry resumes the same order.
 const keys = useRef(new Map<string, string>());
 async function load() {
  setStatus('loading');
  const result = await fetchMyPlan();
  if (result.ok) { setAccount(result.data); setStatus('ready'); }
  else setStatus('error');
 }
 useEffect(() => { let live = true; void fetchMyPlan().then(result => { if (!live) return; if (result.ok) { setAccount(result.data); setStatus('ready'); } else setStatus('error'); }); return () => { live = false; }; }, []);
 async function buy(provider: Provider, autoRenew: boolean) {
  const plan = catalog?.plans.find((p) => p.code === context?.plan);
  const price = plan?.prices.find((p) => p.interval === context?.interval);
  if (!price) return;
  setBuying(true); setBuyError(null);
  const renew = provider === 'momo' || autoRenew;
  const checkoutKey = `${provider}:${price.id}:${renew}`;
  const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  let key = keys.current.get(checkoutKey);
  if (!key) { key = newKey(); keys.current.set(checkoutKey, key); }
  let result = await startCheckout(price.id, key, provider, renew);
  // That order was cancelled or ran out: this click starts a new one.
  if (result.ok && ['cancelled', 'expired', 'failed'].includes(result.data.status)) {
   key = newKey(); keys.current.set(checkoutKey, key);
   result = await startCheckout(price.id, key, provider, renew);
  }
  if (!result.ok) { setBuyError(result.error); setBuying(false); return; }
  window.location.assign(result.data.checkoutUrl ?? `/checkout/${result.data.orderId}`);
 }
 async function cancel() {
  setCancelling(true); setMessage(null);
  const result = await cancelRenewal(account?.renewal?.provider);
  setCancelling(false);
  setMessage(result.ok ? result.data.status === 'cancel_pending' ? {vi:'Đang chờ nhà cung cấp xác nhận hủy. Không bắt đầu kỳ thu mới.',en:'Waiting for the provider to confirm cancellation. No new charge will start.'} : {vi:'Đã hủy tự gia hạn. Gói đã trả vẫn dùng đến hết hạn.',en:'Auto-renewal is cancelled. Paid access remains until expiry.'} : result.error);
  if (result.ok) await load();
 }
 return <PaymentMethodsView catalog={catalog} account={account} accountStatus={status} onCancel={()=>void cancel()} onRetry={()=>{router.refresh();void load();}} cancelling={cancelling} message={message} context={context} onBuy={context?.plan ? (provider, autoRenew) => void buy(provider, autoRenew) : undefined} buying={buying} buyError={buyError} />;
}
