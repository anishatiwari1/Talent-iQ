import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Users, TrendingUp, BarChart3, ArrowRight } from 'lucide-react';

const features = [
  {
    id: "ai-talent-matching",
    icon: Sparkles,
    title: "Smart Talent Matching",
    description: "Find the best employees for a project using skills, experience, availability and current workload.",
    linkText: "Explore Matching",
    to: "/login",
    badge: "Semantic Engine"
  },
  {
    id: "smart-team-allocation",
    icon: Users,
    title: "Smart Team Allocation",
    description: "Build balanced project teams while considering skill coverage, employee availability and workload.",
    linkText: "Learn allocation",
    to: "/login",
    badge: "Optimization"
  },
  {
    id: "skill-gap-analysis",
    icon: TrendingUp,
    title: "Skill Gap Analysis",
    description: "Identify missing skills between current workforce capability and project requirements.",
    linkText: "Analyze skill gaps",
    to: "/login",
    badge: "Gap Matrix"
  },
  {
    id: "workforce-intelligence",
    icon: BarChart3,
    title: "Workforce Intelligence",
    description: "Understand workforce utilization, capability gaps and employee development opportunities.",
    linkText: "View workforce metrics",
    to: "/login",
    badge: "Enterprise Analytics"
  }
];

export const LandingFeatures = () => {
  return (
    <section id="features" className="py-16 md:py-24 bg-transparent border-t border-[#DCE5DF]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DFF2EA] text-[#063C32] text-xs font-semibold uppercase tracking-wider mb-3">
            Core Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#10221E] tracking-tight">
            Intelligent workforce decisions.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#687A73]">
            Intelligent capabilities for understanding talent, building teams and planning workforce development.
          </p>
        </div>

        {/* 4 Modular Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="group relative flex flex-col justify-between bg-white rounded-xl border border-[#DCE5DF] p-6 hover:border-[#075E4F] hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                <div>
                  {/* Icon Container with subtle animation on hover */}
                  <div className="w-12 h-12 rounded-xl bg-[#DFF2EA] flex items-center justify-center text-[#063C32] mb-5 group-hover:bg-[#063C32] group-hover:text-[#A8D85A] transition-colors duration-300">
                    <Icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-[#10221E] tracking-tight group-hover:text-[#063C32] transition-colors">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2.5 text-sm text-[#687A73] leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Bottom Link with animated arrow */}
                <div className="mt-6 pt-4 border-t border-[#DCE5DF]/60">
                  <Link
                    to={feature.to}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075E4F] group-hover:text-[#063C32] transition-colors"
                  >
                    <span>{feature.linkText}</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform duration-200" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default LandingFeatures;
