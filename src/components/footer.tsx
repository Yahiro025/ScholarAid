'use client'

import { GraduationCap, Heart, Sparkles } from 'lucide-react'

const quickLinks = [
  { label: 'Home', href: '#top' },
  { label: 'Eligibility Checker', href: '#eligibility-checker' },
  { label: 'Scholarships', href: '#scholarships' },
  { label: 'AI Reviewer', href: '#ai-reviewer' },
  { label: 'AI Chatbot', href: '#chatbot' },
]

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          {/* Branding */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2 mb-2">
              <img src="/scholaraid-logo.png" alt="ScholarAId" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                ScholarAId
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              AI-powered scholarship finder and exam reviewer built for Filipino
              senior high school students.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-end">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Quick Links
            </h3>
            <nav className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2">
              {quickLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-slate-400 hover:text-emerald-400 transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p className="flex items-center gap-1">
              Built with <Heart className="w-3 h-3 text-amber-400" /> for
              Filipino Students
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </p>
            <p>&copy; {new Date().getFullYear()} ScholarAId. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
