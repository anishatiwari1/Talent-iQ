import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BarChart3, Check, ChevronRight, CircleHelp, Clock3, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const candidates = [
  { name: 'Sarah Khan', role: 'Frontend Engineer', initials: 'SK', score: 94, match: '92%', availability: '85%', workload: '42%', tone: 'bg-[#DFF2EA] text-[#063C32]' },
  { name: 'Rahul Mehta', role: 'Full-stack Engineer', initials: 'RM', score: 89, match: '88%', availability: '76%', workload: '58%', tone: 'bg-[#063C32] text-[#A8D85A]' },
  { name: 'Ananya Shah', role: 'ML Engineer', initials: 'AS', score: 86, match: '84%', availability: '91%', workload: '64%', tone: 'bg-[#EAF0D8] text-[#075E4F]' },
];

const requirements = ['React', 'Python', 'ML', 'PostgreSQL'];
const reveal = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } };

export const LandingHero = () => {
  const [selectedCandidate, setSelectedCandidate] = useState(candidates[0]);
  const [showReason, setShowReason] = useState(false);

  return (
    <section className="relative isolate pb-16 pt-10 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20">
      <div className="hero-grid absolute inset-0 -z-10 opacity-70" />
      <div className="absolute -right-40 top-20 -z-10 h-96 w-96 rounded-full bg-[#DFF2EA]/70 blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
        <motion.div initial="hidden" animate="visible" variants={reveal} transition={{ duration: 0.6 }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C3E7D8] bg-[#DFF2EA]/80 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#075E4F]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#A8D85A] shadow-[0_0_0_4px_rgba(168,216,90,0.18)]" />
            Intelligent workforce platform
          </div>
          <h1 className="max-w-2xl text-[clamp(2.8rem,5.5vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-[#10221E]">
            Build better teams.<br />
            <span className="text-[#075E4F]">Make smarter</span> workforce decisions.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#687A73] sm:text-lg">
            TalentIQ connects employee skills, experience, project requirements and availability to help organizations make smarter workforce decisions.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/register" className="group inline-flex items-center gap-2 rounded-full bg-[#063C32] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_24px_-12px_rgba(6,60,50,0.65)] transition hover:bg-[#075E4F]">
              Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <button onClick={() => document.getElementById('talent-preview')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-2 rounded-full border border-[#DCE5DF] bg-white/75 px-5 py-3.5 text-sm font-bold text-[#10221E] transition hover:border-[#075E4F] hover:bg-white">
              Explore TalentIQ <ChevronRight className="h-4 w-4 text-[#075E4F]" />
            </button>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#DCE5DF] pt-5 text-xs font-semibold text-[#687A73]">
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#075E4F]" /> Explainable matching</span>
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#075E4F]" /> Real-time capacity</span>
          </div>
        </motion.div>

        <motion.div id="talent-preview" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.12 }} className="relative">
          <div className="absolute -left-7 top-12 hidden h-24 w-24 rounded-full border border-[#C3E7D8] lg:block" />
          <div className="relative rounded-[1.35rem] border border-[#C8DAD1] bg-white p-3 shadow-[0_24px_70px_-30px_rgba(6,60,50,0.38)] sm:p-5">
            <div className="flex items-center justify-between border-b border-[#E8EFEA] px-1 pb-4">
              <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#063C32] text-[#A8D85A]"><Sparkles className="h-4 w-4" /></div><div><p className="text-sm font-bold text-[#10221E]">Smart talent matching</p><p className="text-[11px] text-[#687A73]">Live recommendation workspace</p></div></div>
              <span className="hidden items-center gap-1.5 rounded-full bg-[#F3F5EF] px-2.5 py-1 text-[10px] font-bold text-[#075E4F] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#75B857]" /> Synced now</span>
            </div>
            <div className="mt-4 rounded-xl bg-[#F3F5EF] p-4">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#687A73]">Project requirements</p><p className="mt-1 text-base font-bold text-[#10221E]">FinTech platform rebuild</p></div><span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-[#075E4F]">Team of 4</span></div>
              <div className="mt-3 flex flex-wrap gap-1.5">{requirements.map((item) => <span key={item} className="rounded-md border border-[#C3E7D8] bg-white px-2 py-1 text-[11px] font-semibold text-[#075E4F]">{item}</span>)}</div>
            </div>
            <div className="mt-5 flex items-center justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#687A73]">Top matches</p><p className="mt-1 text-sm font-bold text-[#10221E]">Ranked by fit and capacity</p></div><BarChart3 className="h-4 w-4 text-[#075E4F]" /></div>
            <div className="mt-3 space-y-2">
              {candidates.map((candidate) => {
                const active = selectedCandidate.name === candidate.name;
                return <button key={candidate.name} onClick={() => { setSelectedCandidate(candidate); setShowReason(false); }} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? 'border-[#075E4F] bg-[#F4FAF7] shadow-sm' : 'border-[#E8EFEA] bg-white hover:border-[#9BB0A6]'}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${candidate.tone}`}>{candidate.initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-[#10221E]">{candidate.name}</span><span className="block truncate text-[11px] text-[#687A73]">{candidate.role}</span></span><span className="hidden text-right sm:block"><span className="block text-[10px] text-[#687A73]">match</span><span className="text-sm font-extrabold text-[#075E4F]">{candidate.score}%</span></span><ChevronRight className={`h-4 w-4 ${active ? 'text-[#075E4F]' : 'text-[#B0C1B8]'}`} />
                </button>;
              })}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={selectedCandidate.name} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 grid grid-cols-3 gap-2 border-t border-[#E8EFEA] pt-4">
                {[['Skill match', selectedCandidate.match], ['Availability', selectedCandidate.availability], ['Workload', selectedCandidate.workload]].map(([label, value]) => <div key={label} className="rounded-lg bg-[#F3F5EF] px-2.5 py-2"><p className="text-[10px] text-[#687A73]">{label}</p><p className="mt-1 text-sm font-extrabold text-[#10221E]">{value}</p></div>)}
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 flex items-center justify-between gap-3"><button onClick={() => setShowReason(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#075E4F] transition hover:text-[#063C32]">Why this match <CircleHelp className="h-3.5 w-3.5" /></button><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#687A73]"><Clock3 className="h-3.5 w-3.5" /> Updated 2m ago</span></div>
          </div>
          <AnimatePresence>
            {showReason && <motion.aside initial={{ opacity: 0, x: 25 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 25 }} className="absolute inset-y-0 right-0 z-10 w-[min(88%,21rem)] rounded-[1.35rem] bg-[#063C32] p-5 text-white shadow-2xl"><button onClick={() => setShowReason(false)} className="float-right text-xs text-[#C3E7D8] hover:text-white">Close</button><p className="pt-7 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#A8D85A]">Match explanation</p><h3 className="mt-2 text-xl font-semibold">Why {selectedCandidate.name}?</h3><div className="mt-5 grid grid-cols-2 gap-2">{[['Match score', `${selectedCandidate.score}%`], ['Skill match', selectedCandidate.match], ['Experience', '87%'], ['Capacity', selectedCandidate.availability]].map(([label, value]) => <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-3"><p className="text-[10px] text-[#C3E7D8]">{label}</p><p className="mt-1 font-bold text-[#A8D85A]">{value}</p></div>)}</div><ul className="mt-6 space-y-3 text-sm text-[#DFF2EA]"><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#A8D85A]" /> Strong React experience</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#A8D85A]" /> Relevant project history</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#A8D85A]" /> Available for the required period</li></ul><button className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#A8D85A] px-4 py-3 text-sm font-bold text-[#063C32]">Add to team <Users className="h-4 w-4" /></button></motion.aside>}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingHero;
