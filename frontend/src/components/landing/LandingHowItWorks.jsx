import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, FileText, Sparkles, Users2, LineChart, ChevronRight } from 'lucide-react';

const steps = [
  {
    step: "01",
    title: "Employee Profiles",
    description: "Understand skills, certifications, experience, projects and availability.",
    icon: UserCheck,
    detail: "Aggregates multi-dimensional capability profiles, self-reported skills, verified credentials, and real-time project allocation bandwidth."
  },
  {
    step: "02",
    title: "Project Requirements",
    description: "Define required skills, experience level, team size, duration and priority.",
    icon: FileText,
    detail: "Managers input technical specifications, necessary competencies, and project constraints into the structured requirement parser."
  },
  {
    step: "03",
    title: "Smart Talent Matching",
    description: "Match employees using semantic understanding of skills, experience, availability and workload.",
    icon: Sparkles,
    detail: "NLP vector embeddings & knowledge graph reasoning compute precise compatibility scores without simplistic keyword filtering."
  },
  {
    step: "04",
    title: "Team Allocation",
    description: "Build balanced teams based on project requirements and workforce capacity.",
    icon: Users2,
    detail: "Interactive team formation balancing skill coverage, workload limits, and member availability to avoid project bottlenecks."
  },
  {
    step: "05",
    title: "Workforce Intelligence",
    description: "Identify skill gaps and future workforce development opportunities.",
    icon: LineChart,
    detail: "Organizational capability heatmap surfaces deficits, future project hiring requirements, and targeted employee training roadmaps."
  }
];

export const LandingHowItWorks = () => {
  const [activeStep, setActiveStep] = useState(2); // default step 03 active

  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-[#FAFBF8] border-t border-b border-[#DCE5DF]/70 relative overflow-hidden">
      
      {/* Background subtle line accent */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DFF2EA] text-[#063C32] text-xs font-semibold uppercase tracking-wider mb-3">
            Workflow Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#10221E] tracking-tight">
            How It Works
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#687A73]">
            A systematic, intelligent approach to aligning talent with operational objectives.
          </p>
        </div>

        {/* Desktop Connected Progress Track */}
        <div className="relative">
          {/* Connection line in background */}
          <div className="hidden lg:block absolute top-7 left-12 right-12 h-[2px] bg-[#DCE5DF] z-0">
            <motion.div 
              className="h-full bg-[#075E4F]"
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </div>

          {/* 5 Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 relative z-10">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeStep === index;
              return (
                <motion.div
                  key={item.step}
                  onClick={() => setActiveStep(index)}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={`bg-white rounded-xl border p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isActive 
                      ? 'border-[#063C32] shadow-card ring-1 ring-[#063C32]/20 -translate-y-1' 
                      : 'border-[#DCE5DF] hover:border-[#9BB0A6] hover:shadow-subtle'
                  }`}
                >
                  <div>
                    {/* Step Number Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                        isActive 
                          ? 'bg-[#063C32] text-[#A8D85A]' 
                          : 'bg-[#DFF2EA] text-[#063C32]'
                      }`}>
                        {item.step}
                      </span>
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#063C32]' : 'text-[#687A73]'}`} />
                    </div>

                    {/* Step Title */}
                    <h3 className="text-base font-bold text-[#10221E] mb-2">
                      {item.title}
                    </h3>

                    {/* Step Short Description */}
                    <p className="text-xs text-[#687A73] leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Active Indicator dot */}
                  <div className="mt-4 pt-3 border-t border-[#DCE5DF]/60 flex items-center justify-between text-[11px]">
                    <span className={isActive ? 'font-semibold text-[#075E4F]' : 'text-[#687A73]'}>
                      {isActive ? 'Active Phase' : 'Stage Details'}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'text-[#075E4F] translate-x-0.5' : 'text-[#687A73]'}`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Selected Step Deep Dive Banner */}
        <motion.div 
          key={activeStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-8 p-5 bg-white rounded-xl border border-[#DCE5DF] shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#DFF2EA] flex items-center justify-center text-[#063C32] font-bold text-sm flex-shrink-0">
              {steps[activeStep].step}
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#10221E]">
                {steps[activeStep].title}: Operational Mechanism
              </h4>
              <p className="text-xs text-[#687A73] mt-0.5">
                {steps[activeStep].detail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            <span className="text-xs text-[#687A73]">Click any card to inspect phase</span>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default LandingHowItWorks;
