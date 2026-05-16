'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Trophy,
  Sparkles,
  BookOpen,
  Loader2,
  AlertCircle,
  Lightbulb,
  Target,
  GraduationCap,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Types ────────────────────────────────────────────────────────────
interface ExamQuestion {
  question: string
  options: string[]
  correctAnswer: number
  subject: string
  explanation: string
}

interface Scholarship {
  id: string
  name: string
  provider: string
  description: string
  scholarshipType: string
  coverage: string
  examType: string | null
  examSubjects: string | null
}

interface AIReviewerProps {
  scholarshipId?: string
  scholarshipName?: string
  examType?: string
  examSubjects?: string
  onClose?: () => void
}

type Phase = 'select' | 'loading' | 'quiz' | 'results'

// ─── Fun facts & tips for loading state ───────────────────────────────
const funFacts = [
  'The DOST-SEI scholarship has been supporting Filipino students since 1958!',
  'Studies show that practice tests can improve exam scores by up to 25%.',
  'Taking short breaks every 25 minutes (Pomodoro technique) boosts retention.',
  'The UPCAT is taken by over 100,000 students every year.',
  'Teaching a concept to someone else is one of the best ways to learn it.',
  'Sleep helps consolidate memories — review before bed for better recall.',
  'Hydration and a light snack can improve focus during long exams.',
  'The SM Foundation has produced over 4,000 college scholar-graduates.',
  'Writing notes by hand activates more brain areas than typing.',
  'Spaced repetition is more effective than cramming the night before.',
]

// ─── Option labels ────────────────────────────────────────────────────
const OPTION_LABELS = ['A', 'B', 'C', 'D']

// ─── Component ────────────────────────────────────────────────────────
export function AIReviewer({
  scholarshipId: propScholarshipId,
  scholarshipName: propScholarshipName,
  examType: propExamType,
  examSubjects: propExamSubjects,
  onClose,
}: AIReviewerProps) {
  // Phase state
  const [phase, setPhase] = useState<Phase>(
    propScholarshipId ? 'select' : 'select'
  )

  // Scholarship selection
  const [scholarships, setScholarships] = useState<Scholarship[]>([])
  const [selectedId, setSelectedId] = useState<string>(propScholarshipId ?? '')
  const [fetchingScholarships, setFetchingScholarships] = useState(false)
  const [scholarshipError, setScholarshipError] = useState('')

  // Loading state
  const [loadingTip, setLoadingTip] = useState('')

  // Quiz state
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')

  // Derived
  const selectedScholarship = scholarships.find((s) => s.id === selectedId)
  const totalQuestions = questions.length
  const answeredCount = answers.filter((a) => a !== null).length

  // ─── Fetch scholarships ──────────────────────────────────────────
  useEffect(() => {
    if (propScholarshipId) return // skip fetch if pre-selected
    let cancelled = false
    async function load() {
      setFetchingScholarships(true)
      setScholarshipError('')
      try {
        const res = await fetch('/api/scholarships')
        if (!res.ok) throw new Error('Failed to load scholarships')
        const data = await res.json()
        if (!cancelled) {
          // Only show scholarships that have an exam
          const withExam = (data as Scholarship[]).filter(
            (s) => s.examType && s.examType !== 'none' && s.examSubjects
          )
          setScholarships(withExam)
        }
      } catch {
        if (!cancelled) setScholarshipError('Could not load scholarships. Please try again.')
      } finally {
        if (!cancelled) setFetchingScholarships(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [propScholarshipId])

  // ─── Generate reviewer ──────────────────────────────────────────
  const generateReviewer = useCallback(async () => {
    const sid = propScholarshipId || selectedId
    const sname =
      propScholarshipName || selectedScholarship?.name || ''
    const etype =
      propExamType || selectedScholarship?.examType || ''
    const esubjects =
      propExamSubjects || selectedScholarship?.examSubjects || ''

    if (!sid || !sname || !etype || !esubjects) {
      setGenerateError('Please select a scholarship first.')
      return
    }

    setGenerating(true)
    setGenerateError('')
    setLoadingTip(funFacts[Math.floor(Math.random() * funFacts.length)])
    setPhase('loading')

    // Rotate tips every 4 seconds
    const tipInterval = setInterval(() => {
      setLoadingTip(funFacts[Math.floor(Math.random() * funFacts.length)])
    }, 4000)

    try {
      const res = await fetch('/api/reviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scholarshipId: sid,
          scholarshipName: sname,
          examType: etype,
          examSubjects: esubjects,
          numQuestions: 10,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to generate reviewer')
      }

      const data = await res.json()
      const qs: ExamQuestion[] = data.questions
      if (!Array.isArray(qs) || qs.length === 0) {
        throw new Error('No questions were generated. Please try again.')
      }

      setQuestions(qs)
      setAnswers(new Array(qs.length).fill(null))
      setCurrentQuestion(0)
      setPhase('quiz')
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : 'Something went wrong'
      )
      setPhase('select')
    } finally {
      clearInterval(tipInterval)
      setGenerating(false)
    }
  }, [
    propScholarshipId,
    selectedId,
    propScholarshipName,
    propExamType,
    propExamSubjects,
    selectedScholarship,
  ])

  // ─── Quiz helpers ───────────────────────────────────────────────
  const selectAnswer = (optionIndex: number) => {
    setAnswers((prev) => {
      const copy = [...prev]
      copy[currentQuestion] = optionIndex
      return copy
    })
  }

  const goNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }

  const goPrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    }
  }

  const goToQuestion = (index: number) => {
    setCurrentQuestion(index)
  }

  const submitQuiz = () => {
    setPhase('results')
  }

  const tryAgain = () => {
    setAnswers(new Array(totalQuestions).fill(null))
    setCurrentQuestion(0)
    setPhase('quiz')
  }

  const newReviewer = () => {
    setQuestions([])
    setAnswers([])
    setCurrentQuestion(0)
    setGenerateError('')
    setPhase('select')
  }

  // Full reset — also calls onClose to clear parent state
  const handleClose = useCallback(() => {
    // Reset all internal state
    setQuestions([])
    setAnswers([])
    setCurrentQuestion(0)
    setGenerateError('')
    setSelectedId('')
    setPhase('select')
    setScholarshipError('')
    setGenerating(false)
    setLoadingTip('')

    // Notify parent to clear its state (which triggers key change -> full remount)
    if (onClose) onClose()

    // Scroll back to the reviewer section header
    setTimeout(() => {
      const section = document.getElementById('ai-reviewer')
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 150)
  }, [onClose])

  // ─── Results calculation ────────────────────────────────────────
  const correctCount = questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.correctAnswer ? 1 : 0),
    0
  )
  const percentage =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  const performanceMessage = (() => {
    if (percentage >= 90) return "Outstanding! You're well-prepared!"
    if (percentage >= 75) return 'Great job! Keep reviewing to improve.'
    if (percentage >= 50) return 'Good effort! Focus on weak areas.'
    return 'Keep studying! Review the explanations below.'
  })()

  const performanceColor = (() => {
    if (percentage >= 90) return 'text-emerald-600'
    if (percentage >= 75) return 'text-teal-600'
    if (percentage >= 50) return 'text-amber-600'
    return 'text-rose-600'
  })()

  // ─── Circular Progress ──────────────────────────────────────────
  const CircularProgress = ({ value, size = 140 }: { value: number; size?: number }) => {
    const radius = (size - 12) / 2
    const circ = 2 * Math.PI * radius
    const offset = circ - (value / 100) * circ
    const color =
      value >= 90
        ? '#10b981'
        : value >= 75
          ? '#14b8a6'
          : value >= 50
            ? '#f59e0b'
            : '#f43f5e'

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted/30"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {value}%
          </span>
          <span className="text-xs text-muted-foreground">Score</span>
        </div>
      </div>
    )
  }

  // ─── Phase: Select Scholarship ──────────────────────────────────
  if (phase === 'select') {
    const isPreSelected = !!propScholarshipId

    return (
      <div className="w-full max-w-2xl mx-auto">
        <Card className="border-emerald-200/60 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Brain className="h-7 w-7 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">
              AI Exam Reviewer
            </CardTitle>
            <CardDescription className="text-slate-500">
              Generate personalized review questions powered by AI to help you
              ace your scholarship exam.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            {/* Scholarship selector (only if not pre-selected) */}
            {!isPreSelected && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Select a Scholarship
                </label>
                {fetchingScholarships ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading scholarships...
                  </div>
                ) : scholarshipError ? (
                  <div className="flex items-center gap-2 text-sm text-rose-600 py-2">
                    <AlertCircle className="h-4 w-4" />
                    {scholarshipError}
                  </div>
                ) : (
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a scholarship to review for..." />
                    </SelectTrigger>
                    <SelectContent>
                      {scholarships.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Pre-selected info */}
            {isPreSelected && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
                <GraduationCap className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <p className="font-semibold text-emerald-800">
                  {propScholarshipName}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  {propExamType && (
                    <Badge variant="secondary" className="mr-1">
                      {propExamType}
                    </Badge>
                  )}
                  {propExamSubjects && (
                    <span className="text-emerald-600">{propExamSubjects}</span>
                  )}
                </p>
              </div>
            )}

            {/* Selected scholarship details */}
            {selectedScholarship && !isPreSelected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3"
              >
                <div>
                  <h4 className="font-semibold text-slate-800">
                    {selectedScholarship.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {selectedScholarship.provider}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedScholarship.examType && (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-700 border-emerald-200"
                    >
                      <Target className="h-3 w-3 mr-1" />
                      {selectedScholarship.examType}
                    </Badge>
                  )}
                  {selectedScholarship.examSubjects && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-700 border-amber-200"
                    >
                      <BookOpen className="h-3 w-3 mr-1" />
                      {selectedScholarship.examSubjects}
                    </Badge>
                  )}
                </div>
              </motion.div>
            )}

            {/* Error */}
            {generateError && (
              <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-lg p-3 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {generateError}
              </div>
            )}

            {/* Generate button */}
            <Button
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
              onClick={generateReviewer}
              disabled={
                generating ||
                (!isPreSelected && !selectedId) ||
                fetchingScholarships
              }
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Reviewer
                </>
              )}
            </Button>

            {/* Close button */}
            {onClose && (
              <Button
                variant="outline"
                className="w-full text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
                onClick={handleClose}
              >
                <X className="h-4 w-4 mr-1.5" />
                Cancel
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Phase: Loading ─────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="w-full max-w-2xl mx-auto">
        {/* Close / Cancel button - placed above the card */}
        {onClose && (
          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-3 text-slate-500 border-slate-200 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all duration-200"
              onClick={handleClose}
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        )}
        <Card className="border-emerald-200/60 shadow-lg">
          <CardContent className="py-16 flex flex-col items-center text-center space-y-6">
            {/* Animated brain icon */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"
            >
              <Brain className="h-10 w-10 text-emerald-600" />
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-800">
                Generating Review Questions
              </h3>
              <p className="text-sm text-slate-500">
                for{' '}
                <span className="font-semibold text-emerald-600">
                  {propScholarshipName || selectedScholarship?.name}
                </span>
              </p>
            </div>

            {/* Animated progress bar */}
            <div className="w-full max-w-xs">
              <Progress value={undefined} className="h-2" />
              <motion.div
                className="h-2 bg-emerald-500 rounded-full -mt-2"
                initial={{ width: '0%' }}
                animate={{ width: '90%' }}
                transition={{ duration: 15, ease: 'linear' }}
              />
            </div>

            {/* Fun fact / tip */}
            <AnimatePresence mode="wait">
              <motion.div
                key={loadingTip}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 max-w-sm text-left"
              >
                <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{loadingTip}</p>
              </motion.div>
            </AnimatePresence>

            <p className="text-xs text-slate-400">
              This may take 10–30 seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Phase: Quiz ────────────────────────────────────────────────
  if (phase === 'quiz') {
    const q = questions[currentQuestion]
    const selectedAnswer = answers[currentQuestion]
    const isLast = currentQuestion === totalQuestions - 1

    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        {/* Header bar with close button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-700 truncate">
              {propScholarshipName || selectedScholarship?.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {answeredCount}/{totalQuestions} answered
            </div>
            {onClose && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-3 text-slate-500 border-slate-200 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all duration-200"
                onClick={handleClose}
                title="Exit reviewer"
              >
                <X className="h-3.5 w-3.5" />
                <span className="text-xs">Exit</span>
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress
            value={(answeredCount / totalQuestions) * 100}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground text-right">
            {answeredCount} of {totalQuestions} questions answered
          </p>
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <Card className="border-emerald-200/60 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-emerald-600">
                    Question {currentQuestion + 1}
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    {q.subject}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-relaxed text-slate-800">
                  {q.question}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Options */}
                {q.options.map((option, idx) => {
                  const isSelected = selectedAnswer === idx
                  return (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => selectAnswer(idx)}
                      className={`w-full text-left rounded-lg border-2 p-4 transition-all duration-200 cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 shadow-sm shadow-emerald-200/50'
                          : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isSelected
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {OPTION_LABELS[idx]}
                      </span>
                      <span
                        className={`text-sm pt-0.5 ${
                          isSelected
                            ? 'text-emerald-800 font-medium'
                            : 'text-slate-700'
                        }`}
                      >
                        {option}
                      </span>
                    </motion.button>
                  )
                })}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentQuestion === 0}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          {isLast ? (
            <Button
              onClick={submitQuiz}
              disabled={answeredCount < totalQuestions}
              className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all duration-300"
            >
              <Trophy className="h-4 w-4" />
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={goNext}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Question navigation dots */}
        <div className="flex items-center justify-center gap-1.5 pt-2 flex-wrap">
          {questions.map((_, idx) => {
            const isAnswered = answers[idx] !== null
            const isCurrent = idx === currentQuestion
            return (
              <button
                key={idx}
                onClick={() => goToQuestion(idx)}
                className={`h-3 rounded-full transition-all duration-200 cursor-pointer ${
                  isCurrent
                    ? 'w-6 bg-emerald-500'
                    : isAnswered
                      ? 'w-3 bg-emerald-300'
                      : 'w-3 bg-slate-200'
                }`}
                aria-label={`Go to question ${idx + 1}`}
              />
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Phase: Results ─────────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Close / Exit button - placed ABOVE the card to avoid overflow clipping */}
      {onClose && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-3 text-slate-500 border-slate-200 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all duration-200"
            onClick={handleClose}
            title="Close reviewer"
          >
            <X className="h-3.5 w-3.5" />
            Exit Reviewer
          </Button>
        </div>
      )}
      {/* Score summary card */}
      <Card className="border-emerald-200/60 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Circular progress */}
            <CircularProgress value={percentage} />

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h3 className="text-xl font-bold text-slate-800">
                  Quiz Complete!
                </h3>
              </div>
              <p className={`text-lg font-semibold ${performanceColor}`}>
                {performanceMessage}
              </p>
              <p className="text-sm text-slate-500">
                You got{' '}
                <span className="font-bold text-emerald-600">
                  {correctCount}
                </span>{' '}
                out of{' '}
                <span className="font-bold text-slate-700">
                  {totalQuestions}
                </span>{' '}
                questions correct
              </p>

              {/* Score breakdown badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {correctCount} Correct
                </Badge>
                <Badge className="bg-rose-100 text-rose-700 border-rose-200">
                  <XCircle className="h-3 w-3 mr-1" />
                  {totalQuestions - correctCount} Incorrect
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Review all questions */}
      <div className="space-y-4">
        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          Review Your Answers
        </h4>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
          {questions.map((q, idx) => {
            const userAnswer = answers[idx]
            const isCorrect = userAnswer === q.correctAnswer

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card
                  className={`border-l-4 ${
                    isCorrect
                      ? 'border-l-emerald-500'
                      : 'border-l-rose-500'
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-slate-500">
                          Q{idx + 1}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-xs bg-emerald-50 text-emerald-700"
                        >
                          {q.subject}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed">
                      {q.question}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {q.options.map((option, optIdx) => {
                      const isUserAnswer = userAnswer === optIdx
                      const isCorrectOption = q.correctAnswer === optIdx

                      let optionClasses =
                        'rounded-md px-3 py-2 text-sm flex items-start gap-2 '

                      if (isCorrectOption) {
                        optionClasses +=
                          'bg-emerald-50 border border-emerald-300 text-emerald-800'
                      } else if (isUserAnswer && !isCorrect) {
                        optionClasses +=
                          'bg-rose-50 border border-rose-300 text-rose-800'
                      } else {
                        optionClasses +=
                          'bg-slate-50 border border-slate-200 text-slate-600'
                      }

                      return (
                        <div key={optIdx} className={optionClasses}>
                          <span className="font-bold shrink-0">
                            {OPTION_LABELS[optIdx]}.
                          </span>
                          <span className="flex-1">{option}</span>
                          {isCorrectOption && (
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                          {isUserAnswer && !isCorrect && (
                            <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                          )}
                        </div>
                      )
                    })}

                    {/* Explanation */}
                    <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3">
                      <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 leading-relaxed">
                        <span className="font-semibold">Explanation: </span>
                        {q.explanation}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={tryAgain}
          variant="outline"
          className="flex-1 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
        <Button
          onClick={newReviewer}
          className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
        >
          <Sparkles className="h-4 w-4" />
          New Reviewer
        </Button>
        {onClose && (
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700"
          >
            <X className="h-4 w-4" />
            Close Reviewer
          </Button>
        )}
      </div>
    </div>
  )
}
