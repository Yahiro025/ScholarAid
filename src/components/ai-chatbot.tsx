'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  GraduationCap,
  BookOpen,
  HelpCircle,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ─── Suggested Prompts ──────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  {
    icon: GraduationCap,
    label: 'What scholarships can I apply for with an 85% GPA?',
    prompt: 'I have an 85% general average. What scholarships can I apply for?',
  },
  {
    icon: BookOpen,
    label: 'I\'m a STEM student, what are my options?',
    prompt: 'I\'m a STEM student. What scholarships are available for me?',
  },
  {
    icon: HelpCircle,
    label: 'How do I use the Eligibility Checker?',
    prompt: 'How do I use the Eligibility Checker on this website?',
  },
  {
    icon: Sparkles,
    label: 'Tips for scholarship exams?',
    prompt: 'What tips can you give me to prepare for scholarship entrance exams?',
  },
]

// ─── Markdown-like renderer (simple) ────────────────────────────────────────

function renderMessageContent(content: string) {
  // Split into lines and render with basic formatting
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []

  lines.forEach((line, i) => {
    const trimmed = line.trim()

    if (!trimmed) {
      elements.push(<br key={i} />)
      return
    }

    // Bold text
    const boldProcessed = trimmed.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    )

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const text = trimmed.replace(/^[-•]\s*/, '')
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" />
          <span dangerouslySetInnerHTML={{ __html: boldProcessed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-200">$1</strong>') }} />
        </div>
      )
      return
    }

    // Numbered items
    if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s*/, '')
      elements.push(
        <div key={i} className="ml-2" dangerouslySetInnerHTML={{ __html: boldProcessed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-200">$1</strong>') }} />
      )
      return
    }

    // Regular line
    elements.push(
      <span key={i} dangerouslySetInnerHTML={{ __html: boldProcessed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-200">$1</strong>') }} />
    )
  })

  return <div className="space-y-0.5">{elements}</div>
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Kamusta! 👋 I'm ScholarAId Assistant, your friendly scholarship helper! I can answer questions about scholarships, help you check your eligibility, give exam tips, and guide you through the website. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Handle scroll position for scroll-to-bottom button
  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Send message
  const sendMessage = async (text?: string) => {
    const messageText = (text || inputValue).trim()
    if (!messageText || isLoading) return

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Build history for context (last 10 messages)
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: data.timestamp,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          "Sorry, I encountered an error. Please try again in a moment. If the problem persists, you can still browse scholarships and check your eligibility using the tools on this page!",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-new',
        role: 'assistant',
        content:
          "Chat cleared! Feel free to ask me anything about scholarships. I'm here to help! 😊",
        timestamp: new Date().toISOString(),
      },
    ])
  }

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[70vh] flex flex-col rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    ScholarAId Assistant
                  </h3>
                  <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    Online • Ready to help
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  title="Clear chat"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 relative overflow-hidden">
              <ScrollArea
                className="h-[50vh] sm:h-[400px]"
                onScroll={handleScroll}
                ref={scrollAreaRef}
              >
                <div className="p-4 space-y-4">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex gap-2.5 ${
                        msg.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          msg.role === 'assistant'
                            ? 'bg-emerald-100'
                            : 'bg-amber-100'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <Bot className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <User className="h-4 w-4 text-amber-600" />
                        )}
                      </div>

                      {/* Message bubble */}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'assistant'
                            ? 'bg-slate-800 text-slate-200 rounded-tl-sm'
                            : 'bg-emerald-600 text-white rounded-tr-sm'
                        }`}
                      >
                        {msg.role === 'assistant'
                          ? renderMessageContent(msg.content)
                          : msg.content}
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2.5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                        <Bot className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
                          </div>
                          <span className="text-xs text-slate-400 ml-1">
                            Thinking...
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Scroll to bottom button */}
              <AnimatePresence>
                {showScrollButton && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={scrollToBottom}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 shadow-lg transition-colors"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Suggested prompts (show only at start) */}
            {messages.length <= 1 && !isLoading && (
              <div className="px-3 pb-2 shrink-0">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">
                  Try asking
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.label}
                      onClick={() => sendMessage(prompt.prompt)}
                      className="flex items-start gap-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 px-2.5 py-2 text-left text-xs text-slate-300 hover:bg-slate-700/80 hover:border-emerald-600/30 hover:text-emerald-200 transition-all duration-200"
                    >
                      <prompt.icon className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{prompt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="border-t border-slate-700/50 bg-slate-900/95 px-3 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about scholarships..."
                  disabled={isLoading}
                  className="flex-1 h-10 rounded-xl bg-slate-800 border border-slate-700/50 px-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 disabled:opacity-50 transition-colors"
                />
                <Button
                  size="sm"
                  onClick={() => sendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className="h-10 w-10 p-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-40 disabled:shadow-none transition-all duration-200"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-slate-600 mt-1.5 text-center">
                ScholarAId Assistant may make mistakes. Verify important info.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-6 right-4 sm:right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 ${
          isOpen
            ? 'bg-slate-700 hover:bg-slate-600 shadow-slate-700/40'
            : 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30 hover:shadow-emerald-500/50'
        }`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <MessageCircle className="h-6 w-6 text-white" />
              {/* Notification dot */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-amber-900">
                1
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  )
}
