'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, GraduationCap, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'Home', href: '#top' },
  { label: 'AI Matcher', href: '#ai-matcher' },
  { label: 'Eligibility', href: '#eligibility-checker' },
  { label: 'Scholarships', href: '#scholarships' },
  { label: 'Reviewer', href: '#ai-reviewer' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('top')
  const [mobileOpen, setMobileOpen] = useState(false)

  // Track scroll position for frosted glass effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Track active section via IntersectionObserver
  useEffect(() => {
    const sectionIds = ['top', 'ai-matcher', 'eligibility-checker', 'scholarships', 'ai-reviewer']
    const observers: IntersectionObserver[] = []

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (!el) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id)
          }
        },
        { threshold: id === 'top' ? 0.4 : 0.2, rootMargin: id === 'top' ? '-80px 0px 0px 0px' : '-20% 0px -60% 0px' }
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  const handleNavClick = useCallback((href: string) => {
    setMobileOpen(false)
    const id = href.replace('#', '')
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl shadow-lg shadow-black/[0.04] border-b border-slate-200/50'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Logo */}
            <a
              href="#top"
              onClick={(e) => { e.preventDefault(); handleNavClick('#top') }}
              className="flex items-center gap-2.5 group"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 ${
                scrolled
                  ? 'bg-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-white/10 backdrop-blur-sm border border-white/15'
              }`}>
                <GraduationCap className={`h-5 w-5 transition-colors duration-300 ${
                  scrolled ? 'text-white' : 'text-emerald-300'
                }`} />
              </div>
              <span className={`text-lg font-bold tracking-tight font-heading transition-colors duration-300 ${
                scrolled ? 'text-slate-900' : 'text-white'
              }`}>
                Scholar<span className={scrolled ? 'text-emerald-600' : 'text-emerald-400'}>AId</span>
              </span>
            </a>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = activeSection === item.href.replace('#', '')
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => { e.preventDefault(); handleNavClick(item.href) }}
                    className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                      scrolled
                        ? isActive
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        : isActive
                          ? 'text-white bg-white/15'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                    {/* Active indicator dot */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                          scrolled ? 'bg-emerald-500' : 'bg-emerald-400'
                        }`}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </a>
                )
              })}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                size="sm"
                onClick={() => handleNavClick('#ai-matcher')}
                className={`text-sm font-semibold transition-all duration-300 ${
                  scrolled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20'
                }`}
              >
                Get Started
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`md:hidden flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'
              }`}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed top-18 left-4 right-4 z-50 md:hidden bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/10 border border-slate-200/50 overflow-hidden"
            >
              <div className="p-2">
                {navItems.map((item, i) => {
                  const isActive = activeSection === item.href.replace('#', '')
                  return (
                    <motion.a
                      key={item.label}
                      href={item.href}
                      onClick={(e) => { e.preventDefault(); handleNavClick(item.href) }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        isActive ? 'bg-emerald-500' : 'bg-slate-300'
                      }`} />
                      {item.label}
                      {isActive && <ChevronRight className="w-4 h-4 ml-auto text-emerald-500" />}
                    </motion.a>
                  )
                })}
              </div>
              <div className="p-3 border-t border-slate-100">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/20"
                  onClick={() => handleNavClick('#ai-matcher')}
                >
                  Get Started
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
