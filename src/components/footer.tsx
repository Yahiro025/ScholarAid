'use client'

import { GraduationCap, Heart, Sparkles, Brain, BookOpen, Search, MessageCircle, Shield, MapPin, ExternalLink } from 'lucide-react'

const platformLinks = [
  { icon: Brain, label: 'AI Matcher', href: '#ai-matcher' },
  { icon: Search, label: 'Eligibility Checker', href: '#eligibility-checker' },
  { icon: BookOpen, label: 'Scholarship Browser', href: '#scholarships' },
  { icon: MessageCircle, label: 'AI Chatbot', href: '#top' },
]

const categories = [
  'Government Scholarships',
  'University-Funded',
  'Private & Corporate',
  'Merit-Based',
  'Need-Based',
  'STEM Focused',
]

export function Footer() {
  const handleClick = (href: string) => {
    const id = href.replace('#', '')
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="bg-[#080F1A] text-white/70 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* 4-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Column 1 — Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-lg shadow-emerald-600/20">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight font-heading text-white">
                Scholar<span className="text-emerald-400">AId</span>
              </span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed mb-4 max-w-xs">
              AI-powered scholarship finder and exam reviewer built for Filipino
              senior high school students. Your gateway to college education starts here.
            </p>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-white/35">Polytechnic University of the Philippines</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">100% Free</span>
            </div>
          </div>

          {/* Column 2 — Platform */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 font-heading">
              Platform
            </h3>
            <nav className="space-y-2.5">
              {platformLinks.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={(e) => { e.preventDefault(); handleClick(href) }}
                  className="flex items-center gap-2.5 text-sm text-white/40 hover:text-emerald-400 transition-colors duration-200 group"
                >
                  <Icon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                  {label}
                </a>
              ))}
            </nav>
          </div>

          {/* Column 3 — Scholarship Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 font-heading">
              Scholarship Types
            </h3>
            <nav className="space-y-2.5">
              {categories.map((category) => (
                <a
                  key={category}
                  href="#scholarships"
                  onClick={(e) => { e.preventDefault(); handleClick('#scholarships') }}
                  className="block text-sm text-white/40 hover:text-emerald-400 transition-colors duration-200"
                >
                  {category}
                </a>
              ))}
            </nav>
          </div>

          {/* Column 4 — Research Project */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 font-heading">
              About
            </h3>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/20">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-white">Research Project</span>
              </div>
              <p className="text-xs text-white/35 leading-relaxed">
                ScholarAId is a research initiative exploring how AI can democratize
                access to scholarship information and educational opportunities for
                Filipino students, particularly those at PUP.
              </p>
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <a
                  href="#top"
                  onClick={(e) => { e.preventDefault(); handleClick('#top') }}
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Learn more
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Gradient divider */}
        <div className="mt-12 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="flex items-center gap-1.5 text-xs text-white/25">
            Built with <Heart className="w-3 h-3 text-amber-500/70" /> for Filipino Students
            <Sparkles className="w-3 h-3 text-emerald-500/70" />
          </p>
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} ScholarAId. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
