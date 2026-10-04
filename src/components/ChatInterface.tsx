'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Send } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_ACTIONS = [
  'Show me the complete document checklist',
  'What financial documents do I need?',
  'How long does processing take?',
  'Write a cover letter for my application',
]

export default function ChatInterface({
  country,
  visa,
  nationality,
  visaName,
  countryName,
  countryFlag,
  nationalityName,
}: {
  country: string
  visa: string
  nationality: string
  visaName: string
  countryName: string
  countryFlag: string
  nationalityName: string
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm VisaGuide. I'll help you with your **${visaName}** application to **${countryName}** as a **${nationalityName}** passport holder.\n\nI have access to the official embassy requirements and can help you:\n- Understand exactly what documents you need\n- Generate a tailored checklist\n- Draft supporting documents like a cover letter or travel itinerary\n\nWhat would you like to know?`,
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: text }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages([...updatedMessages, assistantMessage])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          country,
          visaType: visa,
          nationality,
        }),
      })

      if (!response.body) return
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const showQuickActions = messages.length <= 1

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-semibold text-slate-900">
            {countryFlag} {countryName} — {visaName}
          </h1>
          <p className="text-xs text-slate-500">{nationalityName} passport</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                msg.content === '' && isLoading && i === messages.length - 1 ? (
                  <span className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </span>
                ) : (
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="font-bold text-lg mt-3 mb-1">{children}</h1>,
                      h2: ({ children }) => <h2 className="font-bold mt-3 mb-1">{children}</h2>,
                      h3: ({ children }) => <h3 className="font-semibold mt-2 mb-1">{children}</h3>,
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="space-y-1 mb-2">{children}</ul>,
                      li: ({ children }) => <li className="flex gap-2 items-start"><span className="text-slate-400 shrink-0 mt-0.5">•</span><span>{children}</span></li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      input: ({ type, checked }) => type === 'checkbox' ? <input type="checkbox" defaultChecked={checked} className="mt-0.5 accent-blue-600" /> : null,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {showQuickActions && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 shrink-0">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action}
              onClick={() => sendMessage(action)}
              className="text-xs bg-white border border-slate-200 text-slate-600 rounded-full px-3 py-1.5 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your visa application..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ maxHeight: '120px' }}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="rounded-xl h-10 w-10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">
          Always verify requirements with the official embassy before applying.
        </p>
      </div>
    </div>
  )
}
