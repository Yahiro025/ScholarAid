'use client'

import { motion } from 'framer-motion'
import { GraduationCap, Sparkles, Search, BookOpen, MessageCircle, Brain, Zap, Shield, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

const stats = [
  { icon: BookOpen, value: '50+', label: 'Scholarships' },
  { icon: Shield, value: '100%', label: 'Free' },
  { icon: Brain, value: 'AI', label: 'Powered' },
  { icon: Clock, value: '24/7', label: 'Access' },
]

const featureCards = [
  { icon: Brain, title: 'AI Matching', desc: 'Personalized scholarship recommendations based on your profile' },
  { icon: Search, title: 'Eligibility Check', desc: 'Instantly know which scholarships you qualify for' },
  { icon: BookOpen, title: 'Smart Reviewer', desc: 'AI-generated exam questions tailored to your target scholarship' },
  { icon: MessageCircle, title: 'AI Chatbot', desc: 'Get answers to any scholarship or admission question' },
]

const strandBadges = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL']

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: '#080F1A' }}
    >
      {/* Dot-grid pattern */}
      <div className="absolute inset-0 bg-dot-pattern pointer-events-none" />

      {/* Radial glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Primary glow — top right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)' }}
        />
        {/* Secondary glow — bottom left */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)' }}
        />
        {/* Accent glow — center bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 0.6 }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)' }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 sm:py-32 lg:py-36">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column — copy */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8"
            >
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">
                Built for PUP Students & Incoming Iskolars
              </span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="font-heading font-extrabold tracking-tight mb-6"
              style={{ fontSize: 'clamp(2.6rem, 7vw, 5rem)', lineHeight: 1.05 }}
            >
              <span className="text-white">
                Find Your Perfect{' '}
              </span>
              <span className="animated-underline bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Scholarship
              </span>
              <br />
              <span className="text-white/80">
                with AI Power
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="text-lg sm:text-xl text-white/60 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed"
            >
              Get AI-powered personalized scholarship recommendations, check your
              eligibility instantly, and prepare for entrance exams — all in one
              platform designed for Filipino students.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12"
            >
              <Button
                size="lg"
                className="group px-8 py-6 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-105"
                onClick={() => document.getElementById('ai-matcher')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Brain className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                Get AI Recommendations
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="group px-8 py-6 text-base font-semibold border-2 border-white/20 text-white/90 hover:bg-white/10 hover:border-white/30 bg-transparent transition-all duration-300 hover:scale-105"
                onClick={() => document.getElementById('eligibility-checker')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Search className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                Check Eligibility
              </Button>
            </motion.div>

            {/* Stats row */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-6 sm:gap-8"
            >
              {stats.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{value}</div>
                    <div className="text-xs text-white/40 uppercase tracking-wider">{label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right column — 2x2 feature cards */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="hidden lg:grid grid-cols-2 gap-4"
          >
            {featureCards.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 + i * 0.1 }}
                className="glass-card rounded-2xl p-6 hover:bg-white/[0.08] transition-all duration-300 group"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1.5 font-heading">{title}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Trust badge strip */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={5}
          className="mt-16 sm:mt-20 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
        >
          <span className="text-xs text-white/30 uppercase tracking-widest mr-2">Strands supported</span>
          {strandBadges.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/[0.05] border border-white/[0.08] text-white/50"
            >
              {badge}
            </span>
          ))}
        </motion.div>
      </div>

      {/* SVG wave at bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120L48 110C96 100 192 80 288 70C384 60 480 60 576 65C672 70 768 80 864 85C960 90 1056 90 1152 82.5C1248 75 1344 60 1392 52.5L1440 45V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0Z"
            fill="oklch(0.985 0.004 95)"
          />
        </svg>
      </div>
    </section>
  )
}
