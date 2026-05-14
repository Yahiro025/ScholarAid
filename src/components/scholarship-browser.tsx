'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  GraduationCap,
  Calendar,
  ExternalLink,
  BookOpen,
  MapPin,
  DollarSign,
  Clock,
  Award,
  FileText,
  Users,
  ChevronRight,
  X,
  Filter,
  Loader2,
  Target,
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Scholarship {
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
}

interface ScholarshipBrowserProps {
  onStartReviewer?: (scholarshipId: string) => void
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'government', label: 'Government' },
  { value: 'private', label: 'Private' },
  { value: 'merit', label: 'Merit-based' },
] as const

const COVERAGE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'full', label: 'Full' },
  { value: 'partial', label: 'Partial' },
] as const

const STRAND_FILTERS = [
  { value: '', label: 'All' },
  { value: 'STEM', label: 'STEM' },
  { value: 'ABM', label: 'ABM' },
  { value: 'HUMSS', label: 'HUMSS' },
  { value: 'GAS', label: 'GAS' },
  { value: 'TVL', label: 'TVL' },
] as const

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Now Accepting' },
  { value: 'false', label: 'Closed' },
] as const

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTypeColor(type: string) {
  switch (type.toLowerCase()) {
    case 'government':
      return {
        strip: 'bg-emerald-500',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: 'text-emerald-500',
        hoverBorder: 'hover:border-emerald-300',
      }
    case 'private':
      return {
        strip: 'bg-amber-500',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: 'text-amber-500',
        hoverBorder: 'hover:border-amber-300',
      }
    case 'merit':
    case 'merit-based':
      return {
        strip: 'bg-teal-500',
        bg: 'bg-teal-50',
        border: 'border-teal-200',
        text: 'text-teal-700',
        badge: 'bg-teal-100 text-teal-800 border-teal-200',
        icon: 'text-teal-500',
        hoverBorder: 'hover:border-teal-300',
      }
    default:
      return {
        strip: 'bg-slate-500',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-700',
        badge: 'bg-slate-100 text-slate-800 border-slate-200',
        icon: 'text-slate-500',
        hoverBorder: 'hover:border-slate-300',
      }
  }
}

function getCoverageBadge(coverage: string) {
  switch (coverage.toLowerCase()) {
    case 'full':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'partial':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'stipend':
      return 'bg-sky-100 text-sky-800 border-sky-200'
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200'
  }
}

function formatTypeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case 'government':
      return 'Government'
    case 'private':
      return 'Private'
    case 'merit':
    case 'merit-based':
      return 'Merit-based'
    case 'academic':
      return 'Academic'
    case 'athletic':
      return 'Athletic'
    case 'financial-need':
      return 'Financial Need'
    default:
      return type.charAt(0).toUpperCase() + type.slice(1)
  }
}

function parseCSV(csv: string): string[] {
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// ─── Card Animation Variants ────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
}

// ─── Skeleton Grid ──────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-2 w-full" />
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/5" />
          </CardContent>
          <CardFooter className="gap-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 flex-1 rounded-md" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

// ─── Filter Chip Component ──────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onClick,
  colorClass,
}: {
  label: string
  active: boolean
  onClick: () => void
  colorClass?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap ${
        active
          ? colorClass || 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Scholarship Card ───────────────────────────────────────────────────────

function ScholarshipCard({
  scholarship,
  index,
  onViewDetails,
  onStartReviewer,
}: {
  scholarship: Scholarship
  index: number
  onViewDetails: (s: Scholarship) => void
  onStartReviewer: (id: string) => void
}) {
  const colors = getTypeColor(scholarship.scholarshipType)
  const strands = parseCSV(scholarship.eligibleStrands)
  const requirements = parseCSV(scholarship.requirements)
  const priorityCourses = scholarship.priorityCourses ? parseCSV(scholarship.priorityCourses) : []

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
      layout
    >
      <Card
        className={`overflow-hidden transition-all duration-300 ${colors.hoverBorder} hover:shadow-md cursor-default group`}
      >
        {/* Color-coded top strip */}
        <div className={`h-2 w-full ${colors.strip}`} />

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors">
              {scholarship.name}
            </h3>
            {/* Application Status Badge */}
            {scholarship.isAcceptingApplications ? (
              <Badge className="shrink-0 bg-green-100 text-green-800 border border-green-200 text-[10px] font-semibold px-1.5 py-0.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 inline-block" />
                Open
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-medium px-1.5 py-0.5">
                Closed
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {scholarship.provider}
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Coverage & Type badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={getCoverageBadge(scholarship.coverage)}>
              <Award className="w-3 h-3 mr-1" />
              {scholarship.coverage.charAt(0).toUpperCase() + scholarship.coverage.slice(1)} Coverage
            </Badge>
            <Badge variant="outline" className={colors.badge}>
              <GraduationCap className="w-3 h-3 mr-1" />
              {formatTypeLabel(scholarship.scholarshipType)}
            </Badge>
          </div>

          {/* Eligible Strands */}
          <div className="flex flex-wrap gap-1.5">
            {strands.slice(0, 4).map((strand) => (
              <span
                key={strand}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600"
              >
                {strand}
              </span>
            ))}
            {strands.length > 4 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500">
                +{strands.length - 4} more
              </span>
            )}
          </div>

          {/* Priority Courses (show first 3) */}
          {priorityCourses.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {priorityCourses.slice(0, 3).map((course) => (
                <span
                  key={course}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100"
                >
                  {course}
                </span>
              ))}
              {priorityCourses.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-500">
                  +{priorityCourses.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* GPA Requirement */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Min GPA: <span className="font-medium text-slate-700">{scholarship.minGPA}</span>
            </span>
          </div>

          {/* Deadline */}
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{scholarship.deadline}</span>
          </div>
        </CardContent>

        <CardFooter className="gap-2 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onViewDetails(scholarship)}
          >
            View Details
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onStartReviewer(scholarship.id)}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1" />
            Start Reviewer
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

// ─── Detail Dialog ──────────────────────────────────────────────────────────

function ScholarshipDetailDialog({
  scholarship,
  open,
  onOpenChange,
  onStartReviewer,
}: {
  scholarship: Scholarship | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartReviewer: (id: string) => void
}) {
  if (!scholarship) return null

  const colors = getTypeColor(scholarship.scholarshipType)
  const strands = parseCSV(scholarship.eligibleStrands)
  const requirements = parseCSV(scholarship.requirements)
  const examSubjects = scholarship.examSubjects ? parseCSV(scholarship.examSubjects) : []
  const priorityCourses = scholarship.priorityCourses ? parseCSV(scholarship.priorityCourses) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        {/* Color-coded header */}
        <div className={`${colors.strip} px-6 pt-5 pb-4`}>
          <DialogHeader>
            <DialogTitle className="text-white text-xl leading-tight">
              {scholarship.name}
            </DialogTitle>
            <DialogDescription className="text-white/80 flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4" />
              {scholarship.provider}
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[65vh]">
          <div className="px-6 pb-6 space-y-5">
            {/* Overview Section */}
            <section>
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                Overview
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {scholarship.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className={getCoverageBadge(scholarship.coverage)}>
                  <Award className="w-3 h-3 mr-1" />
                  {scholarship.coverage.charAt(0).toUpperCase() + scholarship.coverage.slice(1)} Coverage
                </Badge>
                <Badge variant="outline" className={colors.badge}>
                  {formatTypeLabel(scholarship.scholarshipType)}
                </Badge>
              </div>
            </section>

            <Separator />

            {/* Coverage Section */}
            <section>
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Coverage
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {scholarship.coverageDetails || `${scholarship.coverage.charAt(0).toUpperCase() + scholarship.coverage.slice(1)} scholarship coverage.`}
              </p>
            </section>

            <Separator />

            {/* Eligibility Section */}
            <section>
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-emerald-600" />
                Eligibility
              </h4>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-600">
                    Minimum GPA:{' '}
                    <span className="font-semibold text-slate-800">{scholarship.minGPA}</span>
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <GraduationCap className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-600">Eligible Strands:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {strands.map((strand) => (
                        <span
                          key={strand}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"
                        >
                          {strand}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {scholarship.maxAnnualIncome && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-600">
                      Max Annual Income:{' '}
                      <span className="font-semibold text-slate-800">
                        ₱{scholarship.maxAnnualIncome.toLocaleString()}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Priority Courses Section */}
            {priorityCourses.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  Priority Courses
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {priorityCourses.map((course) => (
                    <span
                      key={course}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100"
                    >
                      {course}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  These are the preferred courses for this scholarship. Preference may be given to applicants in these programs.
                </p>
              </section>
            )}

            <Separator />

            {/* Requirements Section */}
            <section>
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Requirements
              </h4>
              <ul className="space-y-1.5">
                {requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                    {req}
                  </li>
                ))}
              </ul>
            </section>

            <Separator />

            {/* Exam Info Section */}
            <section>
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Exam Information
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Award className="w-4 h-4 text-slate-400" />
                  Exam Type:{' '}
                  <span className="font-medium text-slate-800">
                    {scholarship.examType
                      ? formatTypeLabel(scholarship.examType)
                      : 'No exam required'}
                  </span>
                </div>
                {examSubjects.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <BookOpen className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-600">Subjects:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {examSubjects.map((subject) => (
                          <span
                            key={subject}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100"
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Deadline Section */}
            <section>
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Deadline
              </h4>
              <div className="flex items-center gap-3">
                <p className="text-sm text-slate-600">{scholarship.deadline}</p>
                {scholarship.isAcceptingApplications ? (
                  <Badge className="bg-green-100 text-green-800 border border-green-200 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 inline-block" />
                    Now Accepting
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-100 text-slate-500 border border-slate-200 text-xs">
                    Currently Closed
                  </Badge>
                )}
              </div>
            </section>

            <Separator />

            {/* Action Buttons */}
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              {scholarship.websiteUrl && (
                <Button
                  className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all duration-300"
                  asChild
                >
                  <a href={scholarship.websiteUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Go to Application Page
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  onStartReviewer(scholarship.id)
                  onOpenChange(false)
                }}
              >
                <BookOpen className="w-4 h-4" />
                Start Reviewer
              </Button>
            </DialogFooter>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ScholarshipBrowser({ onStartReviewer }: ScholarshipBrowserProps) {
  // State
  const [scholarships, setScholarships] = useState<Scholarship[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [coverageFilter, setCoverageFilter] = useState('')
  const [strandFilter, setStrandFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Debounce search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [search])

  // Fetch scholarships
  const fetchScholarships = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (typeFilter) params.set('type', typeFilter)
      if (coverageFilter) params.set('coverage', coverageFilter)
      if (strandFilter) params.set('strand', strandFilter)
      if (statusFilter) params.set('accepting', statusFilter)

      const res = await fetch(`/api/scholarships?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setScholarships(data)
    } catch (err) {
      console.error('Error fetching scholarships:', err)
      setScholarships([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, typeFilter, coverageFilter, strandFilter, statusFilter])

  useEffect(() => {
    fetchScholarships()
  }, [fetchScholarships])

  // Handlers
  const handleViewDetails = (scholarship: Scholarship) => {
    setSelectedScholarship(scholarship)
    setDialogOpen(true)
  }

  const handleStartReviewer = (scholarshipId: string) => {
    onStartReviewer?.(scholarshipId)
  }

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('')
    setCoverageFilter('')
    setStrandFilter('')
    setStatusFilter('')
  }

  const hasActiveFilters = search || typeFilter || coverageFilter || strandFilter || statusFilter

  return (
    <section id="scholarships" className="w-full bg-gradient-to-b from-[#FAFAF8] to-emerald-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200/60 mb-4">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              Browse Scholarships
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Find Your Perfect Scholarship
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto">
            Explore scholarships available for Filipino senior high school students. 
            Filter by type, coverage, and strand to find the best match for you.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search scholarships by name or provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 h-11 bg-white border-slate-200 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Filter Row */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-3 mb-8"
        >
          {/* By Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1 min-w-fit">
              <Filter className="w-3 h-3" />
              Type:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTERS.map((f) => (
                <FilterChip
                  key={f.value}
                  label={f.label}
                  active={typeFilter === f.value}
                  onClick={() => setTypeFilter(typeFilter === f.value ? '' : f.value)}
                  colorClass="bg-emerald-600 text-white border-emerald-600"
                />
              ))}
            </div>
          </div>

          {/* By Coverage */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1 min-w-fit">
              <Filter className="w-3 h-3" />
              Coverage:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COVERAGE_FILTERS.map((f) => (
                <FilterChip
                  key={f.value}
                  label={f.label}
                  active={coverageFilter === f.value}
                  onClick={() => setCoverageFilter(coverageFilter === f.value ? '' : f.value)}
                  colorClass="bg-amber-600 text-white border-amber-600"
                />
              ))}
            </div>
          </div>

          {/* By Strand */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1 min-w-fit">
              <Filter className="w-3 h-3" />
              Strand:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {STRAND_FILTERS.map((f) => (
                <FilterChip
                  key={f.value}
                  label={f.label}
                  active={strandFilter === f.value}
                  onClick={() => setStrandFilter(strandFilter === f.value ? '' : f.value)}
                  colorClass="bg-teal-600 text-white border-teal-600"
                />
              ))}
            </div>
          </div>

          {/* By Application Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1 min-w-fit">
              <Clock className="w-3 h-3" />
              Status:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <FilterChip
                  key={f.value}
                  label={f.label}
                  active={statusFilter === f.value}
                  onClick={() => setStatusFilter(statusFilter === f.value ? '' : f.value)}
                  colorClass={f.value === 'true' ? 'bg-green-600 text-white border-green-600' : f.value === 'false' ? 'bg-red-500 text-white border-red-500' : 'bg-slate-600 text-white border-slate-600'}
                />
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={clearFilters}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear all filters
              </button>
              <span className="text-xs text-slate-400">
                ({scholarships.length} result{scholarships.length !== 1 ? 's' : ''})
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Results Grid */}
        {loading ? (
          <SkeletonGrid />
        ) : scholarships.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No scholarships found
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Try adjusting your search or filters to find scholarships that match your criteria.
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={clearFilters}
              >
                Clear all filters
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {scholarships.map((scholarship, index) => (
                <ScholarshipCard
                  key={scholarship.id}
                  scholarship={scholarship}
                  index={index}
                  onViewDetails={handleViewDetails}
                  onStartReviewer={handleStartReviewer}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Results count when no filters */}
        {!loading && scholarships.length > 0 && !hasActiveFilters && (
          <p className="text-center text-sm text-slate-400 mt-6">
            Showing {scholarships.length} scholarship{scholarships.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Detail Dialog */}
      <ScholarshipDetailDialog
        scholarship={selectedScholarship}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onStartReviewer={handleStartReviewer}
      />
    </section>
  )
}
