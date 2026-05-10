'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Brain,
  BookOpen,
  Target,
  DollarSign,
  User,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Shield,
  FileText,
  Clock,
  Lightbulb,
  ExternalLink,
  GraduationCap,
  Zap,
  ArrowUpRight,
  RotateCcw,
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface AIAnalysis {
  profileInsight: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    overallAssessment: string
  }
  topRecommendations: {
    scholarshipName: string
    matchReason: string
    applicationStrategy: string
    readinessLevel: 'high' | 'medium' | 'low'
    keyAction: string
  }[]
  applicationReadiness: {
    overallScore: number
    breakdown: {
      academicReadiness: number
      documentReadiness: number
      examReadiness: number
      timelineReadiness: number
    }
    missingDocuments: string[]
    improvementTips: string[]
  }
  nearMissAnalysis: {
    scholarshipName: string
    whatToImprove: string
    realisticTimeline: string
  }[]
  applicationTimeline: {
    scholarshipName: string
    deadlineNote: string
    priority: 'urgent' | 'high' | 'medium' | 'low'
  }[]
}

interface EligibleScholarship {
  id: string
  name: string
  provider: string
  scholarshipType: string
  coverage: string
  isAcceptingApplications: boolean
  minGPA: number
  eligibilityMatch: { gpa: boolean; strand: boolean; income: boolean; course: boolean }
  matchScore: number
  gpaMargin: number
  websiteUrl: string | null
  deadline: string
}

type Step = 1 | 2 | 3 | 4

// ─── Constants ───────────────────────────────────────────────────────────────

const GPA_MIN = 75
const GPA_MAX = 100

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

const INTEREST_OPTIONS = [
  { id: 'technology', label: 'Technology & Computing', icon: '💻' },
  { id: 'science', label: 'Science & Research', icon: '🔬' },
  { id: 'business', label: 'Business & Finance', icon: '📊' },
  { id: 'healthcare', label: 'Healthcare & Medicine', icon: '🏥' },
  { id: 'education', label: 'Education & Teaching', icon: '📚' },
  { id: 'engineering', label: 'Engineering & Design', icon: '⚙️' },
  { id: 'arts', label: 'Arts & Media', icon: '🎨' },
  { id: 'publicservice', label: 'Public Service & Government', icon: '🏛️' },
] as const

const STRENGTH_OPTIONS = [
  { id: 'academics', label: 'Strong Academic Record' },
  { id: 'leadership', label: 'Leadership Experience' },
  { id: 'community', label: 'Community Involvement' },
  { id: 'extracurriculars', label: 'Extracurricular Activities' },
  { id: 'research', label: 'Research Projects' },
  { id: 'sports', label: 'Sports & Athletics' },
  { id: 'arts', label: 'Arts & Creativity' },
  { id: 'communication', label: 'Communication Skills' },
] as const

const READINESS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  urgent: { bg: 'bg-rose-100', text: 'text-rose-700', icon: Clock },
  high: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertCircle },
  medium: { bg: 'bg-sky-100', text: 'text-sky-700', icon: Clock },
  low: { bg: 'bg-slate-100', text: 'text-slate-600', icon: Clock },
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function ReadinessBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const color = value >= 80 ? 'from-emerald-400 to-teal-400' : value >= 50 ? 'from-amber-400 to-yellow-400' : 'from-rose-400 to-red-400'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-slate-600">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="font-semibold text-slate-800">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AIScholarshipMatcher() {
  // Step state
  const [step, setStep] = useState<Step>(1)

  // Form state
  const [gpa, setGpa] = useState(85)
  const [gpaInput, setGpaInput] = useState('85')
  const [strand, setStrand] = useState('')
  const [annualIncome, setAnnualIncome] = useState<number | null>(null)
  const [targetCourse, setTargetCourse] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [strengths, setStrengths] = useState<string[]>([])
  const [scholarshipTypes, setScholarshipTypes] = useState<string[]>([])

  // Results state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [eligibleScholarships, setEligibleScholarships] = useState<EligibleScholarship[]>([])
  const [nearMissScholarships, setNearMissScholarships] = useState<EligibleScholarship[]>([])
  const [summary, setSummary] = useState<{ totalChecked: number; eligibleCount: number; nearMissCount: number; acceptingCount: number } | null>(null)

  const resultsRef = useRef<HTMLDivElement>(null)

  // ─── Handlers ───────────────────────────────────────────────────────────

  const updateGpa = (val: number) => {
    const clamped = Math.min(GPA_MAX, Math.max(GPA_MIN, val))
    setGpa(clamped)
    setGpaInput(String(clamped))
  }

  const handleGpaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '') { setGpaInput(''); return }
    const num = parseFloat(val)
    if (isNaN(num)) return
    setGpaInput(val)
    if (num >= GPA_MIN && num <= GPA_MAX) setGpa(num)
  }

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

  const toggleInterest = (id: string) => {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleStrength = (id: string) => {
    setStrengths(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const handleTypeToggle = (type: string) => {
    setScholarshipTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  const canProceed = () => {
    switch (step) {
      case 1: return strand !== ''
      case 2: return annualIncome !== null
      case 3: return true
      case 4: return true
      default: return false
    }
  }

  const handleNext = () => {
    if (step < 4 && canProceed()) setStep((step + 1) as Step)
  }

  const handlePrev = () => {
    if (step > 1) setStep((step - 1) as Step)
  }

  const handleSubmit = async () => {
    if (!annualIncome) return
    setIsLoading(true)
    setError(null)
    setAiAnalysis(null)

    try {
      const response = await fetch('/api/matcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gpa,
          strand,
          annualIncome,
          targetCourse: targetCourse.trim() || '',
          interests,
          strengths,
          scholarshipTypes,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to get recommendations')
      }

      const data = await response.json()
      setEligibleScholarships(data.eligible || [])
      setNearMissScholarships(data.nearMiss || [])
      setAiAnalysis(data.aiAnalysis)
      setSummary(data.summary)

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setStep(1)
    setGpa(85)
    setGpaInput('85')
    setStrand('')
    setAnnualIncome(null)
    setTargetCourse('')
    setInterests([])
    setStrengths([])
    setScholarshipTypes([])
    setAiAnalysis(null)
    setEligibleScholarships([])
    setNearMissScholarships([])
    setSummary(null)
    setError(null)
  }

  // ─── Step Labels ────────────────────────────────────────────────────────

  const stepLabels = [
    { num: 1, label: 'Academics', icon: BookOpen },
    { num: 2, label: 'Financial', icon: DollarSign },
    { num: 3, label: 'Interests', icon: Target },
    { num: 4, label: 'Review', icon: Sparkles },
  ]

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <section id="ai-matcher" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-200/60 mb-6">
            <Brain className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">AI-Powered Matching</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-4">
            Smart Scholarship{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Matcher
            </span>
          </h2>
          <p className="max-w-2xl mx-auto text-base text-slate-500 leading-relaxed">
            Our AI analyzes your academic profile, interests, and goals to provide personalized
            scholarship recommendations with application strategies — not just static listings.
          </p>
        </motion.div>

        {/* How It's Different Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {[
            { icon: Brain, title: 'AI Analysis', desc: 'LLM-powered reasoning, not just rule-based filtering' },
            { icon: Target, title: 'Personalized', desc: 'Recommendations tailored to YOUR unique profile' },
            { icon: Shield, title: 'Preparedness', desc: 'Application strategy + readiness assessment' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <Icon className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{title}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Step Progress Bar */}
        {!aiAnalysis && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {stepLabels.map(({ num, label, icon: Icon }) => (
                <button
                  key={num}
                  onClick={() => num < step && setStep(num as Step)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    num === step ? 'text-emerald-600' : num < step ? 'text-emerald-500 cursor-pointer hover:text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  <span className={`flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold ${
                    num === step ? 'bg-emerald-600 text-white' : num < step ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {num < step ? '✓' : num}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <Progress value={(step / 4) * 100} className="h-1.5" />
          </div>
        )}

        {/* Form Card */}
        {!aiAnalysis && (
          <Card className="border-slate-200 shadow-lg">
            <CardContent className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {/* ─── Step 1: Academics ─── */}
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">Academic Profile</h3>
                      <p className="text-sm text-slate-500">Tell us about your academic standing and strand.</p>
                    </div>

                    {/* GPA */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-500" />
                        General Average (GPA)
                      </Label>
                      <div className="flex items-center gap-4">
                        <motion.div key={gpa} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex items-baseline gap-0.5 shrink-0">
                          <span className="text-4xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">{gpa}</span>
                          <span className="text-lg font-semibold text-slate-400">%</span>
                        </motion.div>
                        <div className="flex-1">
                          <Slider
                            value={[gpa]}
                            onValueChange={(v) => { setGpa(v[0]); setGpaInput(String(v[0])) }}
                            min={GPA_MIN} max={GPA_MAX} step={0.5}
                            className="[&_[data-slot=slider-track]]:h-2.5 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-emerald-400 [&_[data-slot=slider-range]]:to-teal-400"
                          />
                        </div>
                        <div className="relative w-20 shrink-0">
                          <Input type="number" value={gpaInput} onChange={handleGpaInputChange} onBlur={handleGpaInputBlur}
                            min={GPA_MIN} max={GPA_MAX} step={0.01}
                            className="h-10 text-center text-sm font-semibold pr-7" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Strand */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-500" />
                        Academic Strand <span className="text-rose-400">*</span>
                      </Label>
                      <RadioGroup value={strand} onValueChange={setStrand} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {STRANDS.map((s) => (
                          <Label key={s} htmlFor={`matcher-strand-${s}`}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              strand === s ? 'border-emerald-400 bg-emerald-50/70 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                            }`}>
                            <RadioGroupItem value={s} id={`matcher-strand-${s}`} />
                            <div>
                              <span className="font-semibold text-sm text-slate-800">{s}</span>
                              <p className="text-xs text-slate-500">{STRAND_DESCRIPTIONS[s]}</p>
                            </div>
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>
                  </motion.div>
                )}

                {/* ─── Step 2: Financial ─── */}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">Financial Information</h3>
                      <p className="text-sm text-slate-500">This helps us find scholarships with income requirements you meet.</p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        Annual Family Income <span className="text-rose-400">*</span>
                      </Label>
                      <Select value={annualIncome !== null ? String(annualIncome) : ''} onValueChange={(v) => setAnnualIncome(Number(v))}>
                        <SelectTrigger className="w-full h-11"><SelectValue placeholder="Select your family's annual income range" /></SelectTrigger>
                        <SelectContent>
                          {INCOME_RANGES.map((r) => <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label htmlFor="matcher-course" className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-500" />
                        Intended College Course <span className="text-xs font-normal text-slate-400">(optional)</span>
                      </Label>
                      <Input id="matcher-course" type="text" placeholder="e.g. BS Computer Science, BS Nursing..."
                        value={targetCourse} onChange={(e) => setTargetCourse(e.target.value)}
                        className="h-11 border-slate-300 focus:border-emerald-400" />
                      <div className="flex flex-wrap gap-1.5">
                        {['BS Computer Science', 'BS Nursing', 'BS Engineering', 'BS Accountancy', 'BS Education'].map((c) => (
                          <button key={c} type="button" onClick={() => setTargetCourse(targetCourse === c ? '' : c)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                              targetCourse === c ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ─── Step 3: Interests & Strengths ─── */}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">Interests & Strengths</h3>
                      <p className="text-sm text-slate-500">Help our AI understand what drives you. Select all that apply.</p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-800">Career Interests</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {INTEREST_OPTIONS.map(({ id, label, icon }) => (
                          <button key={id} type="button" onClick={() => toggleInterest(id)}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-all ${
                              interests.includes(id) ? 'border-emerald-400 bg-emerald-50/70 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                            }`}>
                            <span className="text-base">{icon}</span>
                            <span className={`text-xs font-medium ${interests.includes(id) ? 'text-emerald-700' : 'text-slate-600'}`}>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-800">Personal Strengths</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {STRENGTH_OPTIONS.map(({ id, label }) => (
                          <Label key={id} htmlFor={`strength-${id}`}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                              strengths.includes(id) ? 'border-amber-400 bg-amber-50/70 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                            }`}>
                            <Checkbox id={`strength-${id}`} checked={strengths.includes(id)} onCheckedChange={() => toggleStrength(id)}
                              className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" />
                            <span className="text-xs font-medium text-slate-700">{label}</span>
                          </Label>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-800">Scholarship Type Preference <span className="text-xs font-normal text-slate-400">(optional)</span></Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'government', label: 'Government' },
                          { id: 'private', label: 'Private' },
                          { id: 'merit', label: 'Merit-based' },
                        ].map(({ id, label }) => (
                          <Label key={id} htmlFor={`matcher-type-${id}`}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                              scholarshipTypes.includes(id) ? 'border-teal-400 bg-teal-50/70 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                            }`}>
                            <Checkbox id={`matcher-type-${id}`} checked={scholarshipTypes.includes(id)} onCheckedChange={() => handleTypeToggle(id)}
                              className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500" />
                            <span className="text-xs font-medium text-slate-700">{label}</span>
                          </Label>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ─── Step 4: Review & Submit ─── */}
                {step === 4 && (
                  <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">Review Your Profile</h3>
                      <p className="text-sm text-slate-500">Confirm your information before getting AI-powered recommendations.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'GPA', value: `${gpa}%`, icon: BookOpen },
                        { label: 'Strand', value: strand, icon: User },
                        { label: 'Income', value: annualIncome ? `PHP ${annualIncome.toLocaleString()}` : 'Not set', icon: DollarSign },
                        { label: 'Course', value: targetCourse || 'Not specified', icon: Target },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <Icon className="h-4 w-4 text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-[10px] font-medium text-slate-400 uppercase">{label}</p>
                            <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {interests.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1.5">Interests</p>
                        <div className="flex flex-wrap gap-1.5">
                          {interests.map(id => {
                            const opt = INTEREST_OPTIONS.find(o => o.id === id)
                            return opt ? <Badge key={id} variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">{opt.icon} {opt.label}</Badge> : null
                          })}
                        </div>
                      </div>
                    )}

                    {strengths.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1.5">Strengths</p>
                        <div className="flex flex-wrap gap-1.5">
                          {strengths.map(id => {
                            const opt = STRENGTH_OPTIONS.find(o => o.id === id)
                            return opt ? <Badge key={id} variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">{opt.label}</Badge> : null
                          })}
                        </div>
                      </div>
                    )}

                    {/* AI explanation */}
                    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-emerald-600" />
                        <h4 className="text-sm font-bold text-emerald-800">What happens next?</h4>
                      </div>
                      <ul className="space-y-1.5 text-xs text-emerald-700">
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">1</span>
                          <span><strong>Rule-based filtering</strong> — We first narrow down scholarships you&apos;re eligible for based on GPA, strand, and income</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">2</span>
                          <span><strong>AI analysis</strong> — Our LLM analyzes your unique profile against each scholarship, generating personalized match reasons and strategies</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">3</span>
                          <span><strong>Preparedness assessment</strong> — You get a readiness score, document checklist, and application timeline</span>
                        </li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              {error && (
                <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={handlePrev} disabled={step === 1} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                {step < 4 ? (
                  <Button onClick={handleNext} disabled={!canProceed()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={isLoading}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/20 gap-2 px-6">
                    {isLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> AI is analyzing your profile...</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Get AI Recommendations</>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── AI Results ─── */}
        {aiAnalysis && summary && (
          <motion.div ref={resultsRef} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

            {/* Profile Insight Card */}
            <Card className="border-emerald-200/80 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">AI Profile Analysis</h3>
                    <p className="text-xs text-emerald-100">Personalized assessment based on your unique profile</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-slate-700 leading-relaxed italic">&ldquo;{aiAnalysis.profileInsight.overallAssessment}&rdquo;</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Strengths */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                    </h4>
                    {aiAnalysis.profileInsight.strengths.map((s, i) => (
                      <p key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" /> {s}
                      </p>
                    ))}
                  </div>
                  {/* Weaknesses */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-amber-700 uppercase flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Areas to Improve
                    </h4>
                    {aiAnalysis.profileInsight.weaknesses.map((w, i) => (
                      <p key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <ArrowUpRight className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" /> {w}
                      </p>
                    ))}
                  </div>
                  {/* Opportunities */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-teal-700 uppercase flex items-center gap-1">
                      <Lightbulb className="h-3.5 w-3.5" /> Opportunities
                    </h4>
                    {aiAnalysis.profileInsight.opportunities.map((o, i) => (
                      <p key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <Sparkles className="h-3 w-3 text-teal-500 shrink-0 mt-0.5" /> {o}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">{summary.eligibleCount} eligible</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                    <Zap className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700">{summary.acceptingCount} now accepting</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
                    <Target className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-600">{summary.nearMissCount} near-miss</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Application Readiness */}
            <Card className="border-amber-200/80 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-600" />
                    <CardTitle className="text-lg">Application Readiness</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-slate-800">{aiAnalysis.applicationReadiness.overallScore}</span>
                    <span className="text-sm text-slate-400">/100</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ReadinessBar label="Academic Readiness" value={aiAnalysis.applicationReadiness.breakdown.academicReadiness} icon={BookOpen} />
                <ReadinessBar label="Document Readiness" value={aiAnalysis.applicationReadiness.breakdown.documentReadiness} icon={FileText} />
                <ReadinessBar label="Exam Readiness" value={aiAnalysis.applicationReadiness.breakdown.examReadiness} icon={Brain} />
                <ReadinessBar label="Timeline Readiness" value={aiAnalysis.applicationReadiness.breakdown.timelineReadiness} icon={Clock} />

                {aiAnalysis.applicationReadiness.missingDocuments.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-rose-600 uppercase mb-2 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> Documents to Prepare
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAnalysis.applicationReadiness.missingDocuments.map((doc, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">{doc}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {aiAnalysis.applicationReadiness.improvementTips.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-teal-600 uppercase mb-2 flex items-center gap-1">
                      <Lightbulb className="h-3.5 w-3.5" /> Improvement Tips
                    </h4>
                    <ul className="space-y-1.5">
                      {aiAnalysis.applicationReadiness.improvementTips.map((tip, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <Zap className="h-3 w-3 text-teal-500 shrink-0 mt-0.5" /> {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Recommendations */}
            <div>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                <GraduationCap className="h-5 w-5 text-emerald-600" />
                Top AI Recommendations
              </h3>
              <div className="space-y-4">
                {aiAnalysis.topRecommendations.map((rec, i) => {
                  const readiness = READINESS_COLORS[rec.readinessLevel] || READINESS_COLORS.medium
                  const scholarship = eligibleScholarships.find(s => s.name === rec.scholarshipName)
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                      <Card className="border-emerald-200/60 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                        <div className="flex flex-col sm:flex-row">
                          {/* Rank badge */}
                          <div className="sm:w-16 flex sm:flex-col items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white p-3">
                            <span className="text-2xl font-extrabold">#{i + 1}</span>
                            <span className="text-[9px] font-medium uppercase opacity-80">Best Fit</span>
                          </div>
                          <div className="flex-1 p-4 sm:p-5 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div>
                                <h4 className="text-base font-bold text-slate-800">{rec.scholarshipName}</h4>
                                {scholarship && <p className="text-xs text-slate-500">{scholarship.provider}</p>}
                              </div>
                              <Badge className={`${readiness.bg} ${readiness.text} border ${readiness.border} text-xs capitalize shrink-0`}>
                                <Shield className="h-3 w-3 mr-1" />
                                {rec.readinessLevel} readiness
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs font-semibold text-emerald-700 mb-0.5">Why this fits you:</p>
                                <p className="text-xs text-slate-600 leading-relaxed">{rec.matchReason}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-teal-700 mb-0.5">Application strategy:</p>
                                <p className="text-xs text-slate-600 leading-relaxed">{rec.applicationStrategy}</p>
                              </div>
                              <div className="flex items-start gap-1.5 rounded-md bg-amber-50 border border-amber-200 p-2">
                                <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800"><span className="font-semibold">Key action: </span>{rec.keyAction}</p>
                              </div>
                            </div>
                            {scholarship?.websiteUrl && (
                              <Button size="sm" variant="outline" className="text-xs"
                                onClick={() => window.open(scholarship.websiteUrl!, '_blank', 'noopener,noreferrer')}>
                                <ExternalLink className="h-3 w-3 mr-1" /> Application Page
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Application Timeline */}
            {aiAnalysis.applicationTimeline.length > 0 && (
              <Card className="border-slate-200 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-emerald-600" />
                    Application Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aiAnalysis.applicationTimeline.map((item, i) => {
                      const style = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium
                      const PIcon = style.icon
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <Badge className={`${style.bg} ${style.text} border-0 text-[10px] font-bold uppercase shrink-0`}>
                            <PIcon className="h-3 w-3 mr-0.5" /> {item.priority}
                          </Badge>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{item.scholarshipName}</p>
                            <p className="text-xs text-slate-500">{item.deadlineNote}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Near-Miss Analysis */}
            {aiAnalysis.nearMissAnalysis.length > 0 && (
              <Card className="border-amber-200/60 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-amber-600" />
                    Almost There — How to Qualify
                  </CardTitle>
                  <CardDescription>Scholarships you&apos;re close to qualifying for and what to improve</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiAnalysis.nearMissAnalysis.map((nm, i) => (
                    <div key={i} className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/50 space-y-1.5">
                      <p className="text-sm font-semibold text-slate-800">{nm.scholarshipName}</p>
                      <p className="text-xs text-slate-600 flex items-start gap-1.5">
                        <ArrowUpRight className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                        {nm.whatToImprove}
                      </p>
                      <p className="text-xs text-slate-500 flex items-start gap-1.5">
                        <Clock className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                        <span className="italic">Timeline: {nm.realisticTimeline}</span>
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Reset Button */}
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleReset} className="gap-2 px-6">
                <RotateCcw className="h-4 w-4" /> Start New Analysis
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
