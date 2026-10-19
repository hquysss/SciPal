'use client';
import { PaymentMethodsView } from '@/features/billing/PaymentMethods';
import { PricingPage } from '@/features/billing/PricingPage';
import { PricingFrame } from '@/features/billing/PricingFrame';
import { MyPlanView } from '@/features/billing/MyPlan';
import type { BillingPlan } from '@scipal/types';
const plans: BillingPlan[] = [
 { code:'student_free', audience:'student', name:{en:'Student Free',vi:'Học sinh Miễn phí'},description:{en:'All published lessons',vi:'Mọi bài học đã xuất bản'},perks:[],active:true,version:1,prices:[],limits:[] },
 { code:'student_plus', audience:'student', name:{en:'Student Plus',vi:'Học sinh Plus'},description:{en:'More questions and graded exams',vi:'Thêm lượt hỏi và thi có chấm điểm'},perks:[],active:true,version:1,prices:[{id:'b0000000-0000-4000-8000-000000000001',interval:'month',amountVnd:39000},{id:'b0000000-0000-4000-8000-000000000002',interval:'year',amountVnd:390000}],limits:[] },
];
export default function VnpayCheck() { return <main className="mx-auto flex w-full max-w-4xl flex-col gap-7 px-4 pb-20 pt-8 sm:px-6 sm:pt-12"><header><p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">Thanh toán</p><h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Phương thức thanh toán</h1><p className="mt-3 text-sm text-ink-muted">Chọn cách thanh toán gói học và quản lý tự gia hạn tại đây.</p></header><PaymentMethodsView catalog={{plans,checkoutOpen:true,payosCheckoutOpen:true,vnpayCheckoutOpen:true,vnpayAutoRenewOpen:true,vnpaySandbox:true,momoAutoRenewOpen:false}} context={{plan:'student_plus',interval:'month'}} onBuy={()=>{}} accountStatus="ready" account={{role:'student',plan:'student_plus',paidThrough:'2026-11-10T00:00:00.000Z',quotas:[],renewal:{provider:'vnpay',status:'cancel_pending',interval:'month',amountVnd:39000,nextChargeAt:null}}} onCancel={()=>{}} /><PricingPage plans={plans} checkoutOpen payosCheckoutOpen viewerRole="student" /></main>; }
