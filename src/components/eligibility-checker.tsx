'use client'

import { useState, useRef } from 'react'
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
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
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
  requirements: string
  deadline: string
  examType: string | null
  examSubjects: string | null
  websiteUrl: string | null
  isActive: boolean
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
          </div>

          {/* Quick info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Min GPA: {scholarship.minGPA}%</span>
            {scholarship.maxAnnualIncome && (
              <span>Max Income: PHP {scholarship.maxAnnualIncome.toLocaleString()}</span>
            )}
            <span>Deadline: {scholarship.deadline}</span>
          </div>

          {/* View Details Button */}
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
              onClick={() => {
                if (scholarship.websiteUrl) {
                  window.open(scholarship.websiteUrl, '_blank', 'noopener,noreferrer')
                }
              }}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              View Details
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

          {/* View Details */}
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-slate-700 h-7 text-xs"
            onClick={() => {
              if (scholarship.websiteUrl) {
                window.open(scholarship.websiteUrl, '_blank', 'noopener,noreferrer')
              }
            }}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View Details
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
  const [strand, setStrand] = useState('')
  const [annualIncome, setAnnualIncome] = useState<number | null>(null)
  const [scholarshipTypes, setScholarshipTypes] = useState<string[]>([])

  // Results state
  const [results, setResults] = useState<EligibilityResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ineligibleOpen, setIneligibleOpen] = useState(false)

  // Ref for scrolling to results
  const resultsRef = useRef<HTMLDivElement>(null)

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
    setStrand('')
    setAnnualIncome(null)
    setScholarshipTypes([])
    setResults(null)
    setError(null)
    setIneligibleOpen(false)
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
              {/* 1. GPA Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                    General Average (GPA)
                  </Label>
                  <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                    {gpa}%
                  </span>
                </div>
                <Slider
                  value={[gpa]}
                  onValueChange={(val) => setGpa(val[0])}
                  min={75}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>75%</span>
                  <span className="text-slate-500">Your current general average</span>
                  <span>100%</span>
                </div>
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

              {/* 4. Scholarship Type Preference */}
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
