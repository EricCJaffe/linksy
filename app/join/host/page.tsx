'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, ArrowLeft, Code2 } from 'lucide-react'

const MONTHLY_USER_OPTIONS = [
  'Under 500',
  '500 – 2,000',
  '2,000 – 10,000',
  '10,000 – 50,000',
  'Over 50,000',
]

export default function HostOnboardingPage() {
  const [form, setForm] = useState({
    org_name: '',
    website: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    use_case: '',
    expected_monthly_users: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-7 w-7 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Request Received!</h2>
          <p className="text-gray-500 mb-6">
            Thank you for your interest in embedding Linksy on your site. Our team will reach out to{' '}
            <strong>{form.contact_email}</strong> within 2–3 business days to get you set up.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-blue-600">Linksy</Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900">Sign In</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Embed Linksy on Your Site</h1>
          <p className="mt-2 text-gray-500">
            Add an AI-powered resource finder to your website or platform. Fill out this form and
            we&apos;ll get you set up with a custom embed code. Fields marked * are required.
          </p>
        </div>

        {/* What you get */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <Code2 className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-purple-900 mb-1">What you&apos;ll get</p>
              <p className="text-sm text-purple-700">
                Once approved, you&apos;ll receive a single line of code to paste on any page. The widget
                is fully branded to your organization and powered by AI-assisted natural language search.
              </p>
              <code className="block mt-3 text-xs bg-purple-100 rounded px-3 py-2 text-purple-800 font-mono">
                {'<script src="https://linksy.app/widget.js" data-slug="your-slug"></script>'}
              </code>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Organization */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Organization Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  value={form.org_name}
                  onChange={set('org_name')}
                  placeholder="County Health Department"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website *</label>
                <input
                  type="url"
                  required
                  value={form.website}
                  onChange={set('website')}
                  placeholder="https://yoursite.gov"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">How will you use the widget?</label>
                <textarea
                  value={form.use_case}
                  onChange={set('use_case')}
                  rows={3}
                  placeholder="e.g. We want to embed a resource finder on our public-facing benefits portal so residents can find local services without leaving our site…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected monthly visitors</label>
                <select
                  value={form.expected_monthly_users}
                  onChange={set('expected_monthly_users')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="">Select range…</option>
                  {MONTHLY_USER_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Primary Contact</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.contact_name}
                  onChange={set('contact_name')}
                  placeholder="Alex Johnson"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.contact_email}
                  onChange={set('contact_email')}
                  placeholder="alex@yoursite.gov"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={form.contact_phone}
                  onChange={set('contact_phone')}
                  placeholder="(555) 000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </section>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-purple-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Request Widget Access'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            We&apos;ll review your request and follow up via email within 2–3 business days.
          </p>
        </form>
      </main>
    </div>
  )
}
