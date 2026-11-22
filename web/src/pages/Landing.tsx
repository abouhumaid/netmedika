import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  Check,
  ClipboardCheck,
  HeartPulse,
  LockKeyhole,
  PackageCheck,
  Pill,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const SERVICES = [
  {
    icon: ClipboardCheck,
    title: 'Prescription review',
    description: 'A clear review process helps pharmacy teams check prescriptions and follow up on every request.',
  },
  {
    icon: PackageCheck,
    title: 'Order updates',
    description: 'Keep order progress visible from pharmacy review through payment, delivery, and completion.',
  },
  {
    icon: HeartPulse,
    title: 'Care services',
    description: 'Bring medicine orders and health service requests together in one connected experience.',
  },
];

const STEPS = [
  { number: '01', title: 'Send a request', detail: 'Customers submit medicine details or a prescription for review.' },
  { number: '02', title: 'Pharmacy review', detail: 'The pharmacy team checks the request and shares the next steps.' },
  { number: '03', title: 'Follow progress', detail: 'Order updates keep customers and the pharmacy team in sync.' },
];

export const Landing: React.FC = () => (
  <main className="overflow-hidden bg-[#F7FBFA] text-slate-900">
    <header className="relative z-10 border-b border-white/10 bg-[#073F3C] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <a href="#home" aria-label="NetMedika home" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Pill size={21} className="-rotate-45" />
          </span>
          <span>
            <span className="block text-[17px] font-extrabold tracking-tight">NetMedika</span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-teal-100/70">Better care, connected</span>
          </span>
        </a>
        <nav aria-label="Main navigation" className="hidden items-center gap-8 text-[13px] font-semibold text-teal-50/80 md:flex">
          <a href="#services" className="transition hover:text-white">Services</a>
          <a href="#how-it-works" className="transition hover:text-white">How it works</a>
          <a href="#pharmacies" className="transition hover:text-white">For pharmacies</a>
        </nav>
        <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-teal-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-teal-50 sm:px-5 sm:text-sm">
          Admin sign in <ArrowRight size={15} />
        </Link>
      </div>
    </header>

    <section id="home" className="relative isolate overflow-hidden bg-[#073F3C] text-white">
      <div className="absolute inset-0 -z-10 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.35) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
      <div className="absolute -right-32 top-8 -z-10 h-[440px] w-[440px] rounded-full border border-teal-100/10 sm:right-[-8rem] sm:h-[580px] sm:w-[580px]" />
      <div className="absolute -right-20 top-20 -z-10 h-[330px] w-[330px] rounded-full border border-teal-100/10 sm:right-[-4rem] sm:h-[450px] sm:w-[450px]" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[1.03fr_.97fr] lg:gap-14 lg:px-12 lg:pb-28 lg:pt-24">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-100/20 bg-white/[0.07] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.17em] text-teal-100 sm:text-[11px]">
            <Sparkles size={13} className="text-teal-200" /> A simpler path to pharmacy care
          </div>
          <h1 className="text-[42px] font-extrabold leading-[1.06] tracking-[-0.045em] sm:text-6xl lg:text-[68px]">
            Care that moves <span className="text-[#76D9C2]">with you.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-7 text-teal-50/75 sm:text-[17px] sm:leading-8">
            NetMedika connects customers and pharmacy teams around medicine requests, prescription review, and clear order updates.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#76D9C2] px-5 text-sm font-extrabold text-[#073F3C] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#9AE8D6]">
              Open pharmacy portal <ArrowRight size={16} />
            </Link>
            <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-bold text-white transition hover:bg-white/10">
              See how it works <ArrowDownRight size={16} />
            </a>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-[11px] font-semibold text-teal-50/65 sm:text-xs">
            <span className="flex items-center gap-2"><Check size={14} className="text-[#76D9C2]" /> Prescription review workflow</span>
            <span className="flex items-center gap-2"><Check size={14} className="text-[#76D9C2]" /> Order progress in one place</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
          <div className="absolute -inset-5 rounded-[34px] bg-teal-300/10 blur-2xl" />
          <div className="relative rounded-[26px] border border-white/15 bg-white p-3.5 text-slate-900 shadow-[0_35px_90px_rgba(0,0,0,.3)] sm:rounded-[30px] sm:p-4">
            <div className="flex items-center justify-between rounded-[20px] bg-[#F4FAF8] px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white"><Activity size={19} /></span>
                <span><span className="block text-xs font-extrabold text-slate-900">Pharmacy overview</span><span className="mt-0.5 block text-[10px] font-medium text-slate-400">A clear view of today’s work</span></span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-800">Workspace</span>
            </div>

            <div className="grid grid-cols-2 gap-3 px-1 pt-3 sm:gap-3.5 sm:px-1.5 sm:pt-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><ClipboardCheck size={16} /></span>
                <span className="mt-3 block text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">Needs review</span>
                <span className="mt-1 block text-xl font-extrabold text-slate-900">Prescriptions</span>
                <span className="mt-1 block text-[10px] text-slate-400">Review incoming requests</span>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><PackageCheck size={16} /></span>
                <span className="mt-3 block text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">Order progress</span>
                <span className="mt-1 block text-xl font-extrabold text-slate-900">One workflow</span>
                <span className="mt-1 block text-[10px] text-slate-400">From request to completion</span>
              </div>
            </div>

            <div className="mx-1 mt-3 rounded-2xl border border-slate-100 p-3.5 sm:mx-1.5 sm:mt-4 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <div><p className="text-[11px] font-extrabold text-slate-900">Order journey</p><p className="mt-0.5 text-[9px] text-slate-400">Keep each request moving forward</p></div>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700"><ArrowRight size={15} /></span>
              </div>
              <div className="space-y-2">
                {[
                  ['Prescription received', 'Review details and confirm next steps', 'bg-amber-400'],
                  ['Order being prepared', 'Keep progress visible to the customer', 'bg-teal-500'],
                  ['Delivery completed', 'Close the loop with a status update', 'bg-emerald-500'],
                ].map(([title, detail, dot]) => (
                  <div key={title} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-bold text-slate-700">{title}</span><span className="mt-0.5 block truncate text-[9px] text-slate-400">{detail}</span></span>
                    <Check size={14} className="text-teal-600" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 px-2 pb-1 pt-3 text-[9px] font-semibold text-slate-400 sm:px-3 sm:pt-4"><LockKeyhole size={12} className="text-teal-700" /> Secure access for authorized pharmacy teams</div>
          </div>
          <div className="absolute -bottom-5 -left-4 hidden items-center gap-2.5 rounded-2xl border border-white/70 bg-white px-4 py-3 shadow-xl sm:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={18} /></span>
            <span><span className="block text-[10px] font-extrabold text-slate-800">Built around your workflow</span><span className="mt-0.5 block text-[9px] text-slate-400">Every order has a next step</span></span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-[#F7FBFA]" />
    </section>

    <section id="services" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.19em] text-teal-700">One connected experience</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Pharmacy care, made easier to follow.</h2>
        <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">Tools that help customers make requests and help pharmacy teams manage the work behind them.</p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5 lg:mt-14">
        {SERVICES.map(({ icon: Icon, title, description }, index) => (
          <article key={title} className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,.035)] transition duration-200 hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_20px_45px_rgba(15,118,110,.1)] sm:p-7">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${index === 1 ? 'bg-teal-700 text-white' : 'bg-teal-50 text-teal-700'}`}><Icon size={22} /></span>
            <h3 className="mt-5 text-lg font-extrabold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            <a href="#how-it-works" className="mt-5 inline-flex items-center gap-1.5 text-xs font-extrabold text-teal-700 transition group-hover:gap-2.5">Explore workflow <ArrowRight size={14} /></a>
          </article>
        ))}
      </div>
    </section>

    <section id="how-it-works" className="border-y border-slate-200/70 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.8fr_1.2fr] lg:gap-16 lg:px-12 lg:py-24">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.19em] text-teal-700">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Clear steps. Better handoffs.</h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">Each part of the process has a place, helping pharmacy teams and customers stay aligned as a request moves forward.</p>
          <Link to="/login" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-teal-700 hover:text-teal-800">Go to the admin portal <ArrowRight size={16} /></Link>
        </div>
        <div className="space-y-3">
          {STEPS.map((step) => (
            <div key={step.number} className="flex gap-4 rounded-2xl border border-slate-100 bg-[#F8FBFA] p-4 sm:gap-5 sm:p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-xs font-extrabold text-white">{step.number}</span>
              <span><span className="block text-sm font-extrabold text-slate-900">{step.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500 sm:text-sm">{step.detail}</span></span>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section id="pharmacies" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0F766E] to-[#073F3C] px-6 py-9 text-white sm:px-10 sm:py-12 lg:flex lg:items-center lg:justify-between lg:px-14">
        <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="relative max-w-xl">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-teal-100/80">For pharmacy teams</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Bring your daily order workflow into focus.</h2>
          <p className="mt-3 text-sm leading-6 text-teal-50/75">Review requests, manage order status, and keep important updates close at hand.</p>
        </div>
        <Link to="/login" className="relative mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-teal-900 transition hover:-translate-y-0.5 hover:bg-teal-50 lg:mt-0">Sign in to your workspace <ArrowRight size={16} /></Link>
      </div>
    </section>

    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <span className="flex items-center gap-2 font-extrabold text-slate-600"><Pill size={15} className="-rotate-45 text-teal-700" /> NetMedika</span>
        <span>Supporting clearer pharmacy care, one request at a time.</span>
        <Link to="/login" className="font-bold text-teal-700 hover:text-teal-800">Administrator sign in</Link>
      </div>
    </footer>
  </main>
);
