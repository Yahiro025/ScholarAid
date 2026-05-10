'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  Search,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ExternalLink,
  Loader2,
  Trophy,
  AlertCircle,
  BookOpen,
  DollarSign,
  User,
  Sparkles,
  Star,
  Zap,
  TrendingUp,
  Target,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ─── Types ───────────────────────────────────────────────────────────────────

interface EligibilityMatch {
  gpa: boolean
  strand: boolean
  income: boolean
  course: boolean
}

interface ScholarshipWithMatch {
  id: string
  name: string
  provider: string
  description: string
  scholarshipType: string
  coverage: string
  coverageDetails: string | null
  eligibleStrands: string
  minGPA: number
  maxAnnualIncome: number | null
  priorityCourses: string | null
  requirements: string
  deadline: string
  examType: string | null
  examSubjects: string | null
  websiteUrl: string | null
  isActive: boolean
  isAcceptingApplications: boolean
  createdAt: string
  updatedAt: string
  eligibilityMatch: EligibilityMatch
  matchScore: number
}

interface EligibilityResult {
  eligible: ScholarshipWithMatch[]
  ineligible: ScholarshipWithMatch[]
  summary: {
    totalChecked: number
    eligibleCount: number
    ineligibleCount: number
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GPA_MIN = 75
const GPA_MAX = 100

// GPA Tier definitions (Philippine DepEd honors system)
const GPA_TIERS = [
  { min: 98, label: 'With Highest Honors', color: 'text-amber-700', bg: 'bg-gradient-to-r from-amber-50 to-yellow-50', border: 'border-amber-300', icon: Star, iconColor: 'text-amber-500', tip: 'Outstanding! You qualify for the most competitive merit scholarships.' },
  { min: 95, label: 'With High Honors', color: 'text-emerald-700', bg: 'bg-gradient-to-r from-emerald-50 to-teal-50', border: 'border-emerald-300', icon: Zap, iconColor: 'text-emerald-500', tip: 'Excellent! You meet the GPA requirement for top universities and prestigious scholarships.' },
  { min: 90, label: 'With Honors', color: 'text-sky-700', bg: 'bg-gradient-to-r from-sky-50 to-blue-50', border: 'border-sky-300', icon: TrendingUp, iconColor: 'text-sky-500', tip: 'Great standing! Many competitive private and government scholarships are within your reach.' },
  { min: 75, label: 'No Honors', color: 'text-slate-600', bg: 'bg-gradient-to-r from-slate-50 to-gray-50', border: 'border-slate-300', icon: BookOpen, iconColor: 'text-slate-500', tip: 'You still qualify for several programs. Focus on scholarships with lower GPA requirements and consider improving your grades.' },
] as const

function getGpaTier(gpa: number) {
  return GPA_TIERS.find(tier => gpa >= tier.min) || GPA_TIERS[GPA_TIERS.length - 1]
}

// GPA bar color based on value
function getGpaBarColor(gpa: number) {
  if (gpa >= 98) return 'from-amber-400 to-yellow-400'
  if (gpa >= 95) return 'from-emerald-400 to-teal-400'
  if (gpa >= 90) return 'from-sky-400 to-blue-400'
  return 'from-slate-400 to-gray-400'
}

const STRANDS = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL'] as const

const STRAND_DESCRIPTIONS: Record<string, string> = {
  STEM: 'Science, Technology, Engineering & Mathematics',
  ABM: 'Accountancy, Business & Management',
  HUMSS: 'Humanities & Social Sciences',
  GAS: 'General Academic Strand',
  TVL: 'Technical-Vocational & Livelihood',
}

const INCOME_RANGES = [
  { label: 'Below PHP 150,000', value: 150000 },
  { label: 'PHP 150,000 - 250,000', value: 250000 },
  { label: 'PHP 250,000 - 350,000', value: 350000 },
  { label: 'PHP 350,000 - 500,000', value: 500000 },
  { label: 'PHP 500,000 - 750,000', value: 750000 },
  { label: 'Above PHP 750,000', value: 1000000 },
] as const

const SCHOLARSHIP_TYPES = [
  { id: 'government', label: 'Government', description: 'Government-funded programs' },
  { id: 'private', label: 'Private', description: 'Private institution scholarships' },
  { id: 'merit', label: 'Merit-based', description: 'Academic excellence awards' },
] as const

const COVERAGE_COLORS: Record<string, string> = {
  full: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  partial: 'bg-amber-100 text-amber-800 border-amber-200',
  stipend: 'bg-sky-100 text-sky-800 border-sky-200',
}

const TYPE_COLORS: Record<string, string> = {
  government: 'bg-blue-100 text-blue-800 border-blue-200',
  private: 'bg-purple-100 text-purple-800 border-purple-200',
  merit: 'bg-amber-100 text-amber-800 border-amber-200',
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function EligibilityCriteriaBadge({
  match,
  label,
  icon: Icon,
}: {
  match: boolean
  label: string
  icon: React.ElementType
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
        match
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-rose-50 text-rose-700 border border-rose-200'
      }`}
    >
      {match ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <XCircle className="w-3.5 h-3.5" />
      )}
      <Icon className="w-3 h-3" />
      {label}
    </div>
  )
}

function EligibleScholarshipCard({ scholarship }: { scholarship: ScholarshipWithMatch }) {
  return (
    <motion.div variants={staggerItem}>
      <Card className="group border-emerald-200/80 hover:border-emerald-300 hover:shadow-md transition-all duration-300 overflow-hidden">
        {/* Green top accent bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-slate-900 leading-snug">
                {scholarship.name}
              </CardTitle>
              <CardDescription className="text-sm text-slate-500 mt-0.5">
                {scholarship.provider}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={`${COVERAGE_COLORS[scholarship.coverage] || ''} border text-xs capitalize`}>
                {scholarship.coverage}
              </Badge>
              <Badge className={`${TYPE_COLORS[scholarship.scholarshipType] || ''} border text-xs capitalize`}>
                {scholarship.scholarshipType}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Match Score */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">Match Score</span>
              <span className="text-emerald-700 font-bold">{scholarship.matchScore}%</span>
            </div>
            <Progress
              value={scholarship.matchScore}
              className="h-2 bg-emerald-100 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-emerald-400 [&>[data-slot=progress-indicator]]:to-teal-400"
            />
          </div>

          {/* Eligibility Criteria */}
          <div className="flex flex-wrap gap-1.5">
            <EligibilityCriteriaBadge match={scholarship.eligibilityMatch.gpa} label="GPA" icon={BookOpen} />
            <EligibilityCriteriaBadge match={scholarship.eligibilityMatch.strand} label="Strand" icon={User} />
            <EligibilityCriteriaBadge match={scholarship.eligibilityMatch.income} label="Income" icon={DollarSign} />
            <EligibilityCriteriaBadge match={scholarship.eligibilityMatch.course} label="Course" icon={Target} />
          </div>

          {/* Quick info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Min GPA: {scholarship.minGPA}%</span>
            {scholarship.maxAnnualIncome && (
              <span>Max Income: PHP {scholarship.maxAnnualIncome.toLocaleString()}</span>
            )}
            <span className="flex-1">Deadline: {scholarship.deadline}</span>
            {scholarship.isAcceptingApplications ? (
              <span className="text-green-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Now Accepting
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                Closed
              </span>
            )}
          </div>

          {/* Priority Courses */}
          {scholarship.priorityCourses && (
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-600">Priority Courses: </span>
              <span className="line-clamp-2">{scholarship.priorityCourses}</span>
            </div>
          )}

          {/* Application Page Button */}
          <div className="pt-1">
            <Button
              size="sm"
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20 transition-all duration-200"
              onClick={() => {
                if (scholarship.websiteUrl) {
                  window.open(scholarship.websiteUrl, '_blank', 'noopener,noreferrer')
                }
              }}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Go to Application Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function IneligibleScholarshipCard({ scholarship }: { scholarship: ScholarshipWithMatch }) {
  const failedCriteria = [
    { key: 'gpa' as const, label: 'GPA Requirement', icon: BookOpen },
    { key: 'strand' as const, label: 'Strand Requirement', icon: User },
    { key: 'income' as const, label: 'Income Requirement', icon: DollarSign },
    { key: 'course' as const, label: 'Course Requirement', icon: Target },
  ].filter((c) => !scholarship.eligibilityMatch[c.key])

  return (
    <motion.div variants={staggerItem}>
      <Card className="border-slate-200 bg-slate-50/50 hover:shadow-sm transition-all duration-300">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold text-slate-700 leading-snug">
                {scholarship.name}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                {scholarship.provider}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs capitalize">
                {scholarship.coverage}
              </Badge>
              <span className="text-xs font-medium text-slate-500">
                {scholarship.matchScore}% match
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Failed Criteria */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-rose-600">Not met:</p>
            <div className="flex flex-wrap gap-1.5">
              {failedCriteria.map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200"
                >
                  <XCircle className="w-3 h-3" />
                  <Icon className="w-3 h-3" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Partial match progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Partial match</span>
              <span className="text-slate-400">{scholarship.matchScore}%</span>
            </div>
            <Progress
              value={scholarship.matchScore}
              className="h-1.5 bg-slate-200 [&>[data-slot=progress-indicator]]:bg-slate-400"
            />
          </div>

          {/* Application Page Link */}
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 text-xs"
            onClick={() => {
              if (scholarship.websiteUrl) {
                window.open(scholarship.websiteUrl, '_blank', 'noopener,noreferrer')
              }
            }}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Application Page
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function EligibilityChecker() {
  // Form state
  const [gpa, setGpa] = useState(85)
  const [gpaInput, setGpaInput] = useState('85')
  const [strand, setStrand] = useState('')
  const [annualIncome, setAnnualIncome] = useState<number | null>(null)
  const [scholarshipTypes, setScholarshipTypes] = useState<string[]>([])
  const [targetCourse, setTargetCourse] = useState('')

  // Results state
  const [results, setResults] = useState<EligibilityResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ineligibleOpen, setIneligibleOpen] = useState(false)
  // GPA quick-pick feedback
  const [gpaFeedback, setGpaFeedback] = useState<string | null>(null)

  // Ref for scrolling to results
  const resultsRef = useRef<HTMLDivElement>(null)

  // Real-time GPA eligibility preview — counts scholarships where minGPA <= current gpa
  const [gpaEligibleCount, setGpaEligibleCount] = useState<number | null>(null)

  // Fetch count of scholarships eligible for current GPA (lightweight, client-side)
  const fetchGpaPreview = async (gpaVal: number) => {
    try {
      const res = await fetch(`/api/scholarships?minGPA=${gpaVal}`)
      if (res.ok) {
        const data = await res.json()
        setGpaEligibleCount(Array.isArray(data) ? data.length : 0)
      }
    } catch {
      // silently fail — preview is optional
    }
  }

  // Update GPA from slider or input and sync both
  const updateGpa = (val: number) => {
    const clamped = Math.min(GPA_MAX, Math.max(GPA_MIN, val))
    setGpa(clamped)
    setGpaInput(String(clamped))
  }

  // Handle GPA text input change (allow intermediate values while typing)
  const handleGpaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '') {
      setGpaInput('')
      return
    }
    const num = parseFloat(val)
    if (isNaN(num)) return
    // Allow typing intermediate values but clamp display
    setGpaInput(val)
    if (num >= GPA_MIN && num <= GPA_MAX) {
      setGpa(num)
    }
  }

  // Handle GPA input blur — clamp to valid range
  const handleGpaInputBlur = () => {
    let clamped: number
    if (gpaInput === '' || isNaN(parseFloat(gpaInput))) {
      clamped = GPA_MIN
    } else {
      clamped = Math.min(GPA_MAX, Math.max(GPA_MIN, parseFloat(gpaInput)))
    }
    setGpa(clamped)
    setGpaInput(String(clamped))
  }

  // Handle slider change
  const handleSliderChange = (values: number[]) => {
    const val = values[0]
    setGpa(val)
    setGpaInput(String(val))
  }

  // Quick-pick GPA buttons
  const GPA_QUICK_PICKS = [
    { label: '75', value: 75, desc: 'Min' },
    { label: '85', value: 85, desc: 'Good' },
    { label: '90', value: 90, desc: 'Honors' },
    { label: '95', value: 95, desc: 'Top' },
    { label: '100', value: 100, desc: 'Perfect' },
  ]

  const handleQuickPick = (val: number) => {
    updateGpa(val)
    setGpaFeedback(`Set to ${val}%`)
    setTimeout(() => setGpaFeedback(null), 1500)
  }

  // Current tier info
  const currentTier = getGpaTier(gpa)
  const TierIcon = currentTier.icon

  // Debounced GPA eligibility preview
  const fetchGpaPreviewCallback = useCallback(fetchGpaPreview, [])
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGpaPreviewCallback(gpa)
    }, 300) // debounce 300ms
    return () => clearTimeout(timer)
  }, [gpa, fetchGpaPreviewCallback])

  // Handle scholarship type toggle
  const handleTypeToggle = (type: string) => {
    setScholarshipTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  // Form validation
  const isFormValid = strand !== '' && annualIncome !== null

  // Submit handler
  const handleSubmit = async () => {
    if (!isFormValid || annualIncome === null) return

    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gpa,
          strand,
          annualIncome,
          targetCourse: targetCourse.trim() || undefined,
          scholarshipTypes: scholarshipTypes.length > 0 ? scholarshipTypes : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to check eligibility')
      }

      const data: EligibilityResult = await response.json()
      setResults(data)

      // Scroll to results after a brief delay for rendering
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Reset handler
  const handleReset = () => {
    setGpa(85)
    setGpaInput('85')
    setStrand('')
    setAnnualIncome(null)
    setScholarshipTypes([])
    setTargetCourse('')
    setResults(null)
    setError(null)
    setIneligibleOpen(false)
    setGpaEligibleCount(null)
  }

  return (
    <section id="eligibility-checker" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-emerald-50/30 to-white">
      <div className="max-w-3xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/80 border border-emerald-200/60 mb-4">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Eligibility Checker</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Check Your{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Eligibility
            </span>
          </h2>
          <p className="text-slate-600 max-w-lg mx-auto">
            Enter your information below and we&apos;ll instantly match you with scholarships you
            qualify for. It only takes a minute!
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
        >
          <Card className="border-slate-200 shadow-lg">
            <CardContent className="p-6 sm:p-8 space-y-8">
              {/* 1. GPA Input — Enhanced */}
              <div className="space-y-4">
                <Label htmlFor="gpa-input" className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  General Average (GPA)
                </Label>

                {/* Main GPA display & input row */}
                <div className="flex items-center gap-4">
                  {/* Big animated GPA number */}
                  <motion.div
                    key={gpa}
                    initial={{ scale: 0.9, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex items-baseline gap-0.5 shrink-0"
                  >
                    <span className={`text-4xl sm:text-5xl font-extrabold bg-gradient-to-r ${getGpaBarColor(gpa)} bg-clip-text text-transparent`}>
                      {gpa}
                    </span>
                    <span className="text-lg font-semibold text-slate-400">%</span>
                  </motion.div>

                  {/* Tier badge */}
                  <motion.div
                    key={currentTier.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${currentTier.bg} ${currentTier.border}`}
                  >
                    <TierIcon className={`w-3.5 h-3.5 ${currentTier.iconColor}`} />
                    <span className={`text-xs font-semibold ${currentTier.color}`}>{currentTier.label}</span>
                  </motion.div>

                  {/* Eligibility preview pill */}
                  {gpaEligibleCount !== null && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 ml-auto"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">
                        {gpaEligibleCount} scholarship{gpaEligibleCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-emerald-500">GPA-eligible</span>
                    </motion.div>
                  )}
                </div>

                {/* Visual GPA progress bar */}
                <div className="relative">
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${getGpaBarColor(gpa)}`}
                      initial={false}
                      animate={{ width: `${((gpa - GPA_MIN) / (GPA_MAX - GPA_MIN)) * 100}%` }}
                      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    />
                  </div>
                  {/* Tier markers */}
                  <div className="absolute inset-x-0 top-0 h-3 flex">
                    {[90, 95, 98].map((threshold) => (
                      <div
                        key={threshold}
                        className="absolute top-0 h-full"
                        style={{ left: `${((threshold - GPA_MIN) / (GPA_MAX - GPA_MIN)) * 100}%` }}
                      >
                        <div className="w-px h-full bg-white/60" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slider + number input */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Slider
                      value={[gpa]}
                      onValueChange={handleSliderChange}
                      min={GPA_MIN}
                      max={GPA_MAX}
                      step={0.5}
                      className="w-full [&_[data-slot=slider-track]]:h-2.5 [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-emerald-400 [&_[data-slot=slider-range]]:to-teal-400 [&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-emerald-500 [&_[data-slot=slider-thumb]]:shadow-md"
                    />
                  </div>
                  <div className="relative w-24 shrink-0">
                    <Input
                      id="gpa-input"
                      type="number"
                      value={gpaInput}
                      onChange={handleGpaInputChange}
                      onBlur={handleGpaInputBlur}
                      min={GPA_MIN}
                      max={GPA_MAX}
                      step={0.01}
                      placeholder="GPA"
                      className="h-10 text-center text-base font-semibold pr-8 border-slate-300 focus:border-emerald-400 focus:ring-emerald-400/20"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">%</span>
                  </div>
                </div>

                {/* Quick-pick GPA buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 shrink-0">Quick pick:</span>
                  <div className="flex gap-1.5">
                    {GPA_QUICK_PICKS.map((pick) => (
                      <button
                        key={pick.value}
                        type="button"
                        onClick={() => handleQuickPick(pick.value)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 border ${
                          gpa === pick.value
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pick.label}
                        <span className="ml-1 text-[10px] font-normal opacity-60">{pick.desc}</span>
                      </button>
                    ))}
                  </div>
                  {/* Feedback toast on quick pick */}
                  <AnimatePresence>
                    {gpaFeedback && (
                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-xs text-emerald-600 font-medium"
                      >
                        {gpaFeedback}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Tier-based tip */}
                <motion.div
                  key={currentTier.label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className={`flex items-start gap-2 p-3 rounded-lg ${currentTier.bg} border ${currentTier.border}`}
                >
                  <TierIcon className={`w-4 h-4 mt-0.5 shrink-0 ${currentTier.iconColor}`} />
                  <p className={`text-xs ${currentTier.color}`}>
                    {currentTier.tip}
                  </p>
                </motion.div>

                {/* Mobile eligibility preview */}
                {gpaEligibleCount !== null && (
                  <div className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 w-fit">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">
                      {gpaEligibleCount} scholarship{gpaEligibleCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-emerald-500">GPA-eligible</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* 2. Academic Strand */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-500" />
                  Academic Strand
                </Label>
                <RadioGroup
                  value={strand}
                  onValueChange={setStrand}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  {STRANDS.map((s) => (
                    <Label
                      key={s}
                      htmlFor={`strand-${s}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        strand === s
                          ? 'border-emerald-400 bg-emerald-50/70 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <RadioGroupItem value={s} id={`strand-${s}`} />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-slate-800">{s}</span>
                        <p className="text-xs text-slate-500 truncate">{STRAND_DESCRIPTIONS[s]}</p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              {/* 3. Annual Family Income */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Annual Family Income
                </Label>
                <Select
                  value={annualIncome !== null ? String(annualIncome) : ''}
                  onValueChange={(val) => setAnnualIncome(Number(val))}
                >
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Select your family's annual income range" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_RANGES.map((range) => (
                      <SelectItem key={range.value} value={String(range.value)}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">
                  This helps us find scholarships with income requirements you meet.
                </p>
              </div>

              <Separator />

              {/* 4. Target Course */}
              <div className="space-y-3">
                <Label htmlFor="target-course" className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  Intended College Course
                  <span className="text-xs font-normal text-slate-400">(optional)</span>
                </Label>
                <Input
                  id="target-course"
                  type="text"
                  placeholder="e.g. BS Computer Science, BS Nursing, BS Engineering..."
                  value={targetCourse}
                  onChange={(e) => setTargetCourse(e.target.value)}
                  className="h-11 border-slate-300 focus:border-emerald-400 focus:ring-emerald-400/20"
                />
                <p className="text-xs text-slate-400">
                  Some scholarships only accept specific priority courses. Enter your intended course to see which scholarships cover it.
                </p>
                {/* Quick-pick popular courses */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-slate-400 shrink-0 self-center">Popular:</span>
                  {['BS Computer Science', 'BS Nursing', 'BS Engineering', 'BS Accountancy', 'BS Education', 'BS Psychology'].map((course) => (
                    <button
                      key={course}
                      type="button"
                      onClick={() => setTargetCourse(targetCourse === course ? '' : course)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 border ${
                        targetCourse === course
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {course}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 5. Scholarship Type Preference */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-500" />
                  Scholarship Type Preference
                  <span className="text-xs font-normal text-slate-400">(optional)</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SCHOLARSHIP_TYPES.map((type) => (
                    <Label
                      key={type.id}
                      htmlFor={`type-${type.id}`}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        scholarshipTypes.includes(type.id)
                          ? 'border-amber-400 bg-amber-50/70 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Checkbox
                        id={`type-${type.id}`}
                        checked={scholarshipTypes.includes(type.id)}
                        onCheckedChange={() => handleTypeToggle(type.id)}
                        className="mt-0.5 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-slate-800">{type.label}</span>
                        <p className="text-xs text-slate-500">{type.description}</p>
                      </div>
                    </Label>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit / Reset Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!isFormValid || isLoading}
                  className="flex-1 h-12 text-base font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 disabled:opacity-50 disabled:shadow-none"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Checking Eligibility...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Find Matching Scholarships
                    </>
                  )}
                </Button>
                {results && (
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="h-12 border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {results && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="mt-10 space-y-8"
            >
              {/* Summary Stats */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/60">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-200">
                        <Trophy className="w-8 h-8 text-emerald-600" />
                      </div>
                      <div className="text-center sm:text-left flex-1">
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                          You are eligible for{' '}
                          <span className="text-emerald-600">
                            {results.summary.eligibleCount}
                          </span>{' '}
                          out of{' '}
                          <span className="text-slate-700">
                            {results.summary.totalChecked}
                          </span>{' '}
                          scholarships
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {results.summary.eligibleCount > 0
                            ? "Great news! Here are the scholarships you qualify for. Click 'View Details' to learn more about each one."
                            : "Don't worry — there may be other opportunities. Check the partial matches below for scholarships you're close to qualifying for."}
                        </p>
                      </div>
                      {results.summary.eligibleCount > 0 && (
                        <div className="hidden sm:flex flex-col items-center px-4 py-2 rounded-lg bg-emerald-100 border border-emerald-200">
                          <span className="text-3xl font-bold text-emerald-700">
                            {results.summary.totalChecked > 0
                              ? Math.round(
                                  (results.summary.eligibleCount /
                                    results.summary.totalChecked) *
                                    100
                                )
                              : 0}
                            %
                          </span>
                          <span className="text-xs text-emerald-600 font-medium">
                            Match Rate
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Eligible Scholarships */}
              {results.eligible.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-lg font-bold text-slate-900">
                      Eligible Scholarships
                    </h3>
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                      {results.eligible.length}
                    </Badge>
                  </div>
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-4"
                  >
                    {results.eligible.map((scholarship) => (
                      <EligibleScholarshipCard
                        key={scholarship.id}
                        scholarship={scholarship}
                      />
                    ))}
                  </motion.div>
                </div>
              )}

              {/* Ineligible Scholarships (Collapsible) */}
              {results.ineligible.length > 0 && (
                <Collapsible open={ineligibleOpen} onOpenChange={setIneligibleOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-slate-400" />
                        <h3 className="text-base font-semibold text-slate-700">
                          Other Scholarships
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {results.ineligible.length} not fully matched
                        </Badge>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                          ineligibleOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="grid gap-3 mt-3"
                    >
                      {results.ineligible.map((scholarship) => (
                        <IneligibleScholarshipCard
                          key={scholarship.id}
                          scholarship={scholarship}
                        />
                      ))}
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
