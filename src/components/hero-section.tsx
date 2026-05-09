'use client'

import { motion } from 'framer-motion'
import { GraduationCap, Sparkles, Search, BookOpen, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-white via-emerald-50/50 to-emerald-50">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient orb - top right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-emerald-200/40 to-teal-200/30 blur-3xl"
        />

        {/* Medium gradient orb - bottom left */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
          className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-teal-200/40 to-emerald-100/30 blur-3xl"
        />

        {/* Small floating circle */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/6 w-16 h-16 rounded-full bg-emerald-300/20 blur-xl"
        />

        {/* Floating dot pattern */}
        <motion.div
          animate={{
            y: [0, 15, 0],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/3 right-1/5 w-12 h-12 rounded-full bg-teal-300/20 blur-xl"
        />

        {/* Geometric diamond shape */}
        <motion.div
          initial={{ opacity: 0, rotate: 45 }}
          animate={{ opacity: 1, rotate: 45 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute top-20 right-1/4 w-20 h-20 border-2 border-emerald-200/30 rotate-45 rounded-sm"
        />

        {/* Small circle accent */}
        <motion.div
          animate={{
            y: [0, -12, 0],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-40 left-1/3 w-8 h-8 rounded-full border-2 border-teal-200/40"
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Logo */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="mb-6"
        >
          <img
            src="/scholaraid-logo.png"
            alt="ScholarAId Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl shadow-lg shadow-emerald-500/20"
          />
        </motion.div>

        {/* Icon badge */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/80 border border-emerald-200/60 mb-8"
        >
          <GraduationCap className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">
            Built for Filipino Senior High Students
          </span>
          <Sparkles className="w-4 h-4 text-amber-500" />
        </motion.div>

        {/* Main heading with gradient */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6"
        >
          <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
            ScholarAId
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-800 mb-4"
        >
          AI-Powered Scholarship Finder & Exam Reviewer for Filipino Students
        </motion.p>

        {/* Description */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 mb-10 leading-relaxed"
        >
          Discover scholarships you qualify for, check your eligibility instantly
          with AI, and prepare for college entrance exams — all in one platform
          designed for senior high school students in the Philippines.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            size="lg"
            className="group relative px-8 py-6 text-base font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 hover:scale-105"
            onClick={() => document.getElementById('eligibility-checker')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Search className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
            Check Eligibility
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="group px-8 py-6 text-base font-semibold border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-600 transition-all duration-300 hover:scale-105"
            onClick={() => document.getElementById('scholarships')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <BookOpen className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
            Browse Scholarships
          </Button>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={5}
          className="mt-14 flex flex-wrap items-center justify-center gap-3"
        >
          {[
            { icon: Sparkles, label: 'AI-Powered Matching' },
            { icon: Search, label: 'Instant Eligibility Check' },
            { icon: BookOpen, label: 'Smart Exam Review' },
            { icon: MessageCircle, label: 'AI Chatbot Assistant' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-emerald-100 text-sm text-slate-600 backdrop-blur-sm"
            >
              <Icon className="w-3.5 h-3.5 text-emerald-500" />
              {label}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  )
}
