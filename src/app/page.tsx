'use client'

import { useState, useRef, useCallback } from 'react'
import { HeroSection } from '@/components/hero-section'
import { EligibilityChecker } from '@/components/eligibility-checker'
import { ScholarshipBrowser } from '@/components/scholarship-browser'
import { AIReviewer } from '@/components/ai-reviewer'
import { AIChatbot } from '@/components/ai-chatbot'
import { AIScholarshipMatcher } from '@/components/ai-scholarship-matcher'
import { Footer } from '@/components/footer'
import { motion } from 'framer-motion'
import { Brain, Sparkles, BookOpen, Target } from 'lucide-react'

export default function Home() {
  const [reviewerScholarshipId, setReviewerScholarshipId] = useState<string | undefined>()
  const [reviewerScholarshipName, setReviewerScholarshipName] = useState<string | undefined>()
  const [reviewerExamType, setReviewerExamType] = useState<string | undefined>()
  const [reviewerExamSubjects, setReviewerExamSubjects] = useState<string | undefined>()
  const [reviewerResetKey, setReviewerResetKey] = useState(0)
  const reviewerRef = useRef<HTMLDivElement>(null)

  const handleStartReviewer = useCallback(async (scholarshipId: string) => {
    // Fetch scholarship details to pass to the reviewer
    try {
      const res = await fetch(`/api/scholarships?search=`)
      if (res.ok) {
        const scholarships = await res.json()
        const scholarship = scholarships.find((s: { id: string }) => s.id === scholarshipId)
        if (scholarship) {
          setReviewerScholarshipId(scholarship.id)
          setReviewerScholarshipName(scholarship.name)
          setReviewerExamType(scholarship.examType || undefined)
          setReviewerExamSubjects(scholarship.examSubjects || undefined)
        }
      }
    } catch {
      // Fallback: just set the ID
      setReviewerScholarshipId(scholarshipId)
    }

    // Increment reset key to force reviewer reset
    setReviewerResetKey((prev) => prev + 1)

    // Scroll to the reviewer section
    setTimeout(() => {
      reviewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  const handleReviewerClose = useCallback(() => {
    setReviewerScholarshipId(undefined)
    setReviewerScholarshipName(undefined)
    setReviewerExamType(undefined)
    setReviewerExamSubjects(undefined)
    // Increment reset key so the reviewer resets its internal state
    setReviewerResetKey((prev) => prev + 1)
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection />

        {/* AI Scholarship Matcher Section — the core AI-powered feature */}
        <AIScholarshipMatcher />

        {/* Eligibility Checker Section */}
        <EligibilityChecker />

        {/* Scholarship Browser Section */}
        <ScholarshipBrowser onStartReviewer={handleStartReviewer} />

        {/* AI Exam Reviewer Section */}
        <section
          ref={reviewerRef}
          id="ai-reviewer"
          className="relative py-16 sm:py-20 bg-gradient-to-b from-white via-emerald-50/30 to-white"
        >
          {/* Section header */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/80 border border-emerald-200/60 mb-6">
                <Brain className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                  AI-Powered Review
                </span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-4">
                Smart Exam{' '}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  Reviewer
                </span>
              </h2>

              <p className="max-w-xl mx-auto text-base text-slate-500 leading-relaxed">
                Practice with AI-generated questions tailored to your target
                scholarship exam. Get instant feedback and detailed explanations
                to strengthen your weak areas.
              </p>
            </motion.div>

            {/* Feature highlights */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 flex flex-wrap justify-center gap-4"
            >
              {[
                {
                  icon: Target,
                  label: 'Scholarship-Specific Questions',
                  desc: 'Tailored to your exam',
                },
                {
                  icon: Brain,
                  label: 'AI-Generated Content',
                  desc: 'Fresh questions every time',
                },
                {
                  icon: BookOpen,
                  label: 'Detailed Explanations',
                  desc: 'Learn from every answer',
                },
              ].map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-lg bg-white border border-slate-200 px-4 py-3 shadow-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                    <Icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-700">
                      {label}
                    </p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Reviewer component */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8"
          >
            <AIReviewer
              key={reviewerResetKey}
              scholarshipId={reviewerScholarshipId}
              scholarshipName={reviewerScholarshipName}
              examType={reviewerExamType}
              examSubjects={reviewerExamSubjects}
              onClose={handleReviewerClose}
            />
          </motion.div>
        </section>
      </main>
      <Footer />
      <AIChatbot />
    </div>
  )
}
