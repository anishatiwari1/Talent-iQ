import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Send, 
  CheckCircle, 
  Loader2, 
  X, 
  Plus, 
  HelpCircle, 
  ShieldCheck, 
  Handshake, 
  Users, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';

const initialSkills = ["Python", "FastAPI", "Machine Learning", "LLM", "AWS"];

const simulationResults = [
  {
    name: "Anisha Tiwari",
    role: "AI/ML Engineer",
    matchScore: 96,
    skills: ["Python", "Machine Learning", "LLM"],
    experience: "5.5 yrs",
    availability: "Available (85%)",
    avatar: "AT",
    avatarColor: "bg-[#063C32] text-[#A8D85A]"
  },
  {
    name: "Siddhi Tangsali",
    role: "Backend Engineer",
    matchScore: 95,
    skills: ["Python", "FastAPI", "SQL"],
    experience: "4.5 yrs",
    availability: "Available (90%)",
    avatar: "ST",
    avatarColor: "bg-[#075E4F] text-white"
  },
  {
    name: "Shreya Sonawale",
    role: "NLP Engineer",
    matchScore: 92,
    skills: ["Python", "NLP", "LLM"],
    experience: "3.5 yrs",
    availability: "Available (70%)",
    avatar: "SS",
    avatarColor: "bg-[#DFF2EA] text-[#063C32]"
  }
];

export const LandingProjectSimulation = () => {
  const [activeTab, setActiveTab] = useState('simulation'); // 'simulation' | 'contact'
  
  // Simulation form states
  const [projectName, setProjectName] = useState("Smart Customer Support System");
  const [description, setDescription] = useState(
    "Build an intelligent customer support platform that can understand customer queries, generate responses, and integrate with enterprise support workflows."
  );
  const [skills, setSkills] = useState(initialSkills);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [teamSize, setTeamSize] = useState("4 members");
  
  // Simulation execution states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState("");
  const [hasResults, setHasResults] = useState(false);

  // Contact form states
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (newSkillInput.trim() && !skills.includes(newSkillInput.trim())) {
      setSkills([...skills, newSkillInput.trim()]);
      setNewSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulationStep("Analyzing project requirements...");
    
    setTimeout(() => {
      setSimulationStep("Querying semantic skills graph & availability index...");
    }, 600);

    setTimeout(() => {
      setIsSimulating(false);
      setHasResults(true);
    }, 1300);
  };

  const handleResetSimulation = () => {
    setHasResults(false);
    setIsSimulating(false);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    }, 1500);
  };

  return (
    <section id="ai-matching" className="py-16 md:py-24 bg-[#F3F5EF] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Contextual Value & Enterprise Enquiry Pillars (Figma Screen 3 Left side) */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DFF2EA] text-[#063C32] text-xs font-semibold uppercase tracking-wider mb-3">
                Live Simulation & Connect
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#10221E] tracking-tight">
                Let's build smarter teams together.
              </h2>
              <p className="mt-3 text-base text-[#687A73] leading-relaxed">
                Connect with our workforce intelligence experts to see how semantic talent matching and real-time capacity planning can transform your organization.
              </p>
            </div>

            {/* 3 Figma Contact / Enterprise Info Cards */}
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-white border border-[#DCE5DF] shadow-subtle flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#DFF2EA] flex items-center justify-center text-[#063C32] flex-shrink-0 mt-0.5">
                  <HelpCircle className="w-5 h-5 text-[#075E4F]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#10221E]">Product Enquiries</h4>
                  <p className="text-xs text-[#687A73] mt-1 leading-relaxed">
                    Discover how TalentIQ fits within your enterprise architecture & team workflows.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#DCE5DF] shadow-subtle flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#DFF2EA] flex items-center justify-center text-[#063C32] flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5 text-[#075E4F]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#10221E]">Technical Support</h4>
                  <p className="text-xs text-[#687A73] mt-1 leading-relaxed">
                    Guidance on enterprise integrations, data security, and Neo4j knowledge graph configurations.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#DCE5DF] shadow-subtle flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#DFF2EA] flex items-center justify-center text-[#063C32] flex-shrink-0 mt-0.5">
                  <Handshake className="w-5 h-5 text-[#075E4F]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#10221E]">Partnership Discussions</h4>
                  <p className="text-xs text-[#687A73] mt-1 leading-relaxed">
                    Explore strategic collaborations, consulting partnerships, and ecosystem integrations.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick trust metrics */}
            <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#DCE5DF] flex items-center justify-between text-xs text-[#687A73]">
              <div>
                <span className="font-bold text-[#10221E] text-base">500+</span>
                <span className="block text-[11px]">Employees Profiled</span>
              </div>
              <div className="w-[1px] h-8 bg-[#DCE5DF]" />
              <div>
                <span className="font-bold text-[#10221E] text-base">96%</span>
                <span className="block text-[11px]">Matching Accuracy</span>
              </div>
              <div className="w-[1px] h-8 bg-[#DCE5DF]" />
              <div>
                <span className="font-bold text-[#10221E] text-base">Zero</span>
                <span className="block text-[11px]">Skill Bottlenecks</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Simulation Card & Message Form */}
          <div id="project-simulation" className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-[#DCE5DF] shadow-card p-6 sm:p-8">
              
              {/* Card Mode Tabs */}
              <div className="flex items-center justify-between border-b border-[#DCE5DF] pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('simulation')}
                    className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'simulation'
                        ? 'bg-[#063C32] text-white shadow-xs'
                        : 'text-[#687A73] hover:text-[#10221E]'
                    }`}
                  >
                    Project Simulation
                  </button>
                  <button
                    id="contact"
                    onClick={() => setActiveTab('contact')}
                    className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === 'contact'
                        ? 'bg-[#063C32] text-white shadow-xs'
                        : 'text-[#687A73] hover:text-[#10221E]'
                    }`}
                  >
                    Send us a message
                  </button>
                </div>

                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-[#075E4F] font-semibold bg-[#DFF2EA] px-2.5 py-1 rounded-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  Interactive Preview
                </span>
              </div>

              {/* Tab 1: Project Simulation */}
              {activeTab === 'simulation' && (
                <div>
                  {!hasResults && !isSimulating ? (
                    <div className="space-y-5">
                      <div>
                        <div className="text-xs font-semibold text-[#075E4F] uppercase tracking-wider mb-1">
                          Test Semantic Matching
                        </div>
                        <h3 className="text-xl font-bold text-[#10221E]">
                          Define Project Requirements
                        </h3>
                        <p className="text-xs text-[#687A73] mt-1">
                          Enter target parameters to simulate how TalentIQ’s semantic model selects optimal team members.
                        </p>
                      </div>

                      {/* Project Name Field */}
                      <div>
                        <label className="block text-xs font-bold text-[#10221E] uppercase tracking-wider mb-1.5">
                          Project Name
                        </label>
                        <input
                          type="text"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] bg-[#FAFBF8] text-sm text-[#10221E] focus:outline-none focus:border-[#075E4F] focus:bg-white transition-all"
                          placeholder="e.g. Enterprise Cloud Migration"
                        />
                      </div>

                      {/* Description Field */}
                      <div>
                        <label className="block text-xs font-bold text-[#10221E] uppercase tracking-wider mb-1.5">
                          Project Description
                        </label>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] bg-[#FAFBF8] text-sm text-[#10221E] focus:outline-none focus:border-[#075E4F] focus:bg-white transition-all leading-relaxed"
                          placeholder="Briefly describe project objectives and scope..."
                        />
                      </div>

                      {/* Required Skills Chips */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-[#10221E] uppercase tracking-wider">
                            Required Skills ({skills.length})
                          </label>
                          <span className="text-[11px] text-[#687A73]">Click &times; to remove</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-2 p-2 rounded-lg bg-[#FAFBF8] border border-[#DCE5DF] min-h-[46px] items-center">
                          {skills.map((skill) => (
                            <span 
                              key={skill}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#DFF2EA] text-[#063C32] border border-[#C2E5D6]"
                            >
                              <span>{skill}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSkill(skill)}
                                className="text-[#075E4F] hover:text-[#063C32] hover:bg-[#C2E5D6] rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Add Skill mini form */}
                        <form onSubmit={handleAddSkill} className="flex gap-2">
                          <input
                            type="text"
                            value={newSkillInput}
                            onChange={(e) => setNewSkillInput(e.target.value)}
                            placeholder="Add another skill (e.g. Docker, PyTorch)..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-[#DCE5DF] bg-white text-xs text-[#10221E] focus:outline-none focus:border-[#075E4F]"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-[#F3F5EF] border border-[#DCE5DF] text-xs font-semibold text-[#10221E] hover:bg-[#DFF2EA] transition-colors inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add
                          </button>
                        </form>
                      </div>

                      {/* Team Size Selector */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#10221E] uppercase tracking-wider mb-1.5">
                            Target Team Size
                          </label>
                          <select
                            value={teamSize}
                            onChange={(e) => setTeamSize(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] bg-[#FAFBF8] text-xs text-[#10221E] focus:outline-none focus:border-[#075E4F]"
                          >
                            <option value="3 members">3 members (Lean)</option>
                            <option value="4 members">4 members (Standard)</option>
                            <option value="6 members">6 members (Cross-functional)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#10221E] uppercase tracking-wider mb-1.5">
                            Target Duration
                          </label>
                          <select
                            defaultValue="12 weeks"
                            className="w-full px-3 py-2 rounded-lg border border-[#DCE5DF] bg-[#FAFBF8] text-xs text-[#10221E] focus:outline-none focus:border-[#075E4F]"
                          >
                            <option>8 weeks</option>
                            <option>12 weeks</option>
                            <option>24 weeks</option>
                          </select>
                        </div>
                      </div>

                      {/* Find Talent Action Button */}
                      <button
                        type="button"
                        onClick={handleRunSimulation}
                        className="w-full py-3.5 px-4 rounded-xl bg-[#063C32] hover:bg-[#075E4F] text-white font-bold text-sm tracking-wide transition-all shadow-card hover:shadow-card-hover flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                      >
                        <Sparkles className="w-4 h-4 text-[#A8D85A]" />
                        <span>Find Talent</span>
                      </button>
                    </div>
                  ) : isSimulating ? (
                    /* Simulation Loading Animation */
                    <div className="py-16 text-center space-y-5">
                      <div className="inline-flex p-4 rounded-2xl bg-[#DFF2EA] text-[#063C32] animate-spin">
                        <Loader2 className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-[#10221E]">
                          {simulationStep}
                        </h4>
                        <p className="text-xs text-[#687A73] mt-1.5 max-w-sm mx-auto">
                          Evaluating skills vector distance, current project commitments, and availability margins.
                        </p>
                      </div>
                      <div className="w-48 h-1.5 bg-[#DCE5DF] rounded-full mx-auto overflow-hidden">
                        <div className="w-full h-full bg-[#075E4F] animate-pulse" />
                      </div>
                    </div>
                  ) : (
                    /* Simulation Results State */
                    <div className="space-y-5 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between pb-3 border-b border-[#DCE5DF]">
                        <div>
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#075E4F]">
                            <CheckCircle className="w-4 h-4 text-[#075E4F]" />
                            <span>Simulation Complete</span>
                          </div>
                          <h3 className="text-lg font-extrabold text-[#10221E] mt-0.5">
                            3 high-match employees found
                          </h3>
                        </div>
                        <button
                          onClick={handleResetSimulation}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#687A73] hover:text-[#10221E] px-2.5 py-1.5 rounded-lg border border-[#DCE5DF] hover:bg-[#FAFBF8] transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>
                      </div>

                      {/* Result Cards Stack */}
                      <div className="space-y-3">
                        {simulationResults.map((emp, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-xl border border-[#DCE5DF] bg-[#FAFBF8] flex items-center justify-between gap-3 hover:border-[#075E4F] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${emp.avatarColor}`}>
                                {emp.avatar}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-[#10221E]">{emp.name}</div>
                                <div className="text-xs text-[#687A73]">{emp.role} • {emp.experience}</div>
                                <div className="flex gap-1 mt-1">
                                  {emp.skills.map((s, idx) => (
                                    <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-[#DFF2EA] text-[#063C32] rounded font-medium">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-lg font-extrabold text-[#10221E]">{emp.matchScore}%</div>
                              <div className="text-[10px] font-bold text-[#075E4F] uppercase">Match Score</div>
                              <div className="text-[11px] text-[#687A73]">{emp.availability.split(' ')[0]}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 flex flex-col sm:flex-row gap-3">
                        <Link
                          to="/login"
                          className="flex-1 py-3 px-4 rounded-xl bg-[#063C32] hover:bg-[#075E4F] text-white font-bold text-xs sm:text-sm text-center transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <span>Explore Full Team Allocation</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={handleResetSimulation}
                          className="py-3 px-4 rounded-xl bg-white border border-[#DCE5DF] hover:bg-[#FAFBF8] text-[#10221E] font-semibold text-xs sm:text-sm transition-colors"
                        >
                          Modify Parameters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Send us a message (Exact Figma Contact Form) */}
              {activeTab === 'contact' && (
                <div>
                  {contactSubmitted ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#DFF2EA] text-[#063C32] flex items-center justify-center mx-auto">
                        <CheckCircle className="w-6 h-6 text-[#075E4F]" />
                      </div>
                      <h4 className="text-lg font-bold text-[#10221E]">Message Received</h4>
                      <p className="text-xs text-[#687A73] max-w-sm mx-auto">
                        Thank you for reaching out. Our workforce intelligence advisory team will reply within 24 hours.
                      </p>
                      <button
                        onClick={() => setContactSubmitted(false)}
                        className="mt-3 text-xs font-semibold text-[#075E4F] hover:underline"
                      >
                        Send another enquiry
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#10221E]">
                          Send us a message
                        </h3>
                        <p className="text-xs text-[#687A73] mt-0.5">
                          Fill out the details below and our team will get back to you within 24 hours.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#10221E] uppercase tracking-wider mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="e.g. Alex Morgan"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] bg-[#FAFBF8] text-xs sm:text-sm text-[#10221E] focus:outline-none focus:border-[#075E4F]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#10221E] uppercase tracking-wider mb-1">
                            Work Email
                          </label>
                          <input
                            type="email"
                            required
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="alex@company.com"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] bg-[#FAFBF8] text-xs sm:text-sm text-[#10221E] focus:outline-none focus:border-[#075E4F]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#10221E] uppercase tracking-wider mb-1">
                          Message
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          placeholder="Tell us about your team size, talent challenges, or questions..."
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5DF] bg-[#FAFBF8] text-xs sm:text-sm text-[#10221E] focus:outline-none focus:border-[#075E4F] leading-relaxed"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3.5 px-4 rounded-xl bg-[#063C32] hover:bg-[#075E4F] text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4 text-[#A8D85A]" />
                        <span>Send Message</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default LandingProjectSimulation;
