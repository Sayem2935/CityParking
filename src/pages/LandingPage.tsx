import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const stats = [
  { label: 'AI Models Active', value: '4', suffix: '' },
  { label: 'Detection Accuracy', value: '98.2', suffix: '%' },
  { label: 'Vehicle Types', value: '2', suffix: '' },
  { label: 'Response Time', value: '<200', suffix: 'ms' },
];

const features = [
  {
    tag: 'Computer Vision',
    title: 'YOLO Plate Detection',
    description: 'Real-time number plate recognition using YOLO object detection with 98%+ accuracy across all lighting conditions.',
    color: 'from-blue-500 to-cyan-500',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    tag: 'Face AI',
    title: 'Face Recognition Access',
    description: 'Deep learning face embedding extraction with liveness detection for secure, contactless parking access verification.',
    color: 'from-violet-500 to-purple-500',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
      </svg>
    ),
  },
  {
    tag: 'Heat Map',
    title: 'Real-Time Occupancy Map',
    description: 'Live heat map visualization showing parking slot occupancy across all zones, auto-updating on every vehicle entry and exit.',
    color: 'from-emerald-500 to-teal-500',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    tag: 'Document AI',
    title: 'University ID Extraction',
    description: 'AI-powered document extraction from university ID cards using Gemini OCR, extracting student details and saving to user profiles.',
    color: 'from-amber-500 to-orange-500',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
      </svg>
    ),
  },
  {
    tag: 'Security',
    title: 'Multi-Factor Access Control',
    description: 'Combined face + plate verification with anomaly detection, rate limiting, and comprehensive security event logging.',
    color: 'from-red-500 to-orange-500',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
];

const architectureLayers = [
  { name: 'User Interface', tech: 'React + TypeScript + Tailwind', color: 'bg-blue-500/20 border-blue-500/40 text-blue-300' },
  { name: 'API Gateway', tech: 'Spring Boot + JWT Security', color: 'bg-violet-500/20 border-violet-500/40 text-violet-300' },
  { name: 'AI Engine', tech: 'PyTorch + YOLO + Gemini OCR', color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
  { name: 'Data Layer', tech: 'PostgreSQL + Redis + File Storage', color: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return (
    <div className="min-h-screen bg-[#050510] text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{
            background: 'radial-gradient(circle, #3b82f6, transparent 70%)',
            left: mousePos.x - 300,
            top: mousePos.y - 300,
            transition: 'left 0.3s ease-out, top 0.3s ease-out',
          }}
        />
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-blue-600/5 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-50 flex items-center justify-between px-6 lg:px-12 py-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">
            DIU<span className="text-blue-400">PS</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-zinc-500 hover:text-white transition-colors">Features</a>
          <a href="#architecture" className="text-sm text-zinc-500 hover:text-white transition-colors">Architecture</a>
          <a href="#technology" className="text-sm text-zinc-500 hover:text-white transition-colors">Technology</a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 rounded-xl transition-all shadow-lg shadow-blue-500/25"
          >
            Get Started
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-16 pb-24 lg:pt-24 lg:pb-32">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs font-medium text-blue-300 tracking-wide uppercase">AI-Based Smart University Parking Platform</span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="text-4xl md:text-6xl lg:text-7xl font-bold text-center max-w-5xl leading-[1.1] tracking-tight"
        >
          Intelligent Parking
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            for Daffodil International University
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="mt-6 text-lg md:text-xl text-zinc-500 text-center max-w-2xl leading-relaxed"
        >
          Real-time vehicle detection, face recognition access, occupancy heat map visualization,
          and university ID verification — all in one platform for DIU.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="mt-10 flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 text-base font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 rounded-2xl transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            Launch Dashboard
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 text-base font-semibold border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            View Demo
          </button>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {stat.value}
                <span className="text-blue-400">{stat.suffix}</span>
              </div>
              <div className="mt-1 text-sm text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Problem Statement */}
      <section className="relative z-10 px-6 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            custom={0}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold tracking-widest uppercase text-red-400 mb-4 block">The Problem</span>
            <h2 className="text-3xl md:text-4xl font-bold">University Parking is Broken</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { stat: '30%', label: 'of urban traffic is drivers searching for parking', color: 'border-red-500/30 bg-red-500/5' },
              { stat: '17h', label: 'average time per year spent looking for parking spots', color: 'border-amber-500/30 bg-amber-500/5' },
              { stat: '$73B', label: 'annual economic cost of parking inefficiency in the US', color: 'border-orange-500/30 bg-orange-500/5' },
            ].map((item, i) => (
              <motion.div
                key={item.stat}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                custom={i + 1}
                className={`rounded-2xl border p-8 text-center ${item.color}`}
              >
                <div className="text-4xl md:text-5xl font-bold text-white mb-3">{item.stat}</div>
                <p className="text-zinc-500 text-sm leading-relaxed">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-6 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            custom={0}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold tracking-widest uppercase text-blue-400 mb-4 block">AI Capabilities</span>
            <h2 className="text-3xl md:text-4xl font-bold">AI-Powered Smart Parking. Simplified.</h2>
            <p className="mt-4 text-zinc-500 max-w-xl mx-auto">
              Computer vision, face recognition, heat map visualization, and document extraction — all in one platform.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={i}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] p-6 transition-all duration-300 hover:border-white/[0.12] hover:scale-[1.02]"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 text-white shadow-lg`}>
                  {feature.icon}
                </div>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-500">{feature.tag}</span>
                <h3 className="text-lg font-semibold text-white mt-1 mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="relative z-10 px-6 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            custom={0}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold tracking-widest uppercase text-violet-400 mb-4 block">System Architecture</span>
            <h2 className="text-3xl md:text-4xl font-bold">Enterprise-Grade Stack</h2>
          </motion.div>

          <div className="space-y-4">
            {architectureLayers.map((layer, i) => (
              <motion.div
                key={layer.name}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={i}
                className={`flex items-center justify-between rounded-xl border px-6 py-4 ${layer.color}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{layer.name}</div>
                    <div className="text-xs opacity-70">{layer.tech}</div>
                  </div>
                </div>
                <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Deep Dive */}
      <section id="technology" className="relative z-10 px-6 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            custom={0}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-4 block">Technology Stack</span>
            <h2 className="text-3xl md:text-4xl font-bold">Built with Industry Leaders</h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'React 18', desc: 'Frontend UI' },
              { name: 'Spring Boot', desc: 'Backend API' },
              { name: 'PyTorch', desc: 'AI Inference' },
              { name: 'PostgreSQL', desc: 'Database' },
              { name: 'YOLOv8', desc: 'Object Detection' },
              { name: 'Gemini API', desc: 'Document OCR' },
              { name: 'Recharts', desc: 'Data Visualization' },
              { name: 'Docker', desc: 'Deployment' },
            ].map((tech, i) => (
              <motion.div
                key={tech.name}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={i}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-center hover:bg-white/[0.05] transition-all"
              >
                <div className="font-semibold text-sm text-white">{tech.name}</div>
                <div className="text-xs text-zinc-500 mt-1">{tech.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-20 lg:py-28">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          custom={0}
          className="max-w-3xl mx-auto text-center rounded-3xl border border-white/[0.08] bg-gradient-to-b from-blue-500/10 to-violet-500/10 p-12 lg:p-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Experience the Future of Parking</h2>
          <p className="text-zinc-500 mb-8 max-w-lg mx-auto">
            Access the full AI-powered dashboard with real-time monitoring, heat map visualization, and smart vehicle management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 text-base font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 rounded-2xl transition-all shadow-xl shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              Create Free Account
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 text-base font-semibold border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign In to Dashboard
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-zinc-500">DIPS</span>
          </div>
          <p className="text-xs text-zinc-600">
            AI-Based Smart University Parking Access Control — Daffodil International University
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;