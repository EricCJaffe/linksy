'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import { RichTextEditor } from '@/components/ui/rich-text-editor'

export default function ProviderOnboardingPage() {
  const [form, setForm] = useState({
    org_name: '',
    sector: '',
    description: '',
    services: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    phone: '',
    hours: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
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
      const res = await fetch('/api/onboarding/provider', {
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
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Request Received!</h2>
          <p className="text-gray-500 mb-6">
            Thank you for your interest in being listed on Linksy. Our team will review your request
            and reach out to <strong>{form.contact_email}</strong> within 2–3 business days.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
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
          <h1 className="text-3xl font-bold text-gray-900">Request to Be Listed</h1>
          <p className="mt-2 text-gray-500">
            Tell us about your organization and we&apos;ll review your request to be added to the Linksy
            resource directory. Fields marked * are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Organization Info */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Organization Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  value={form.org_name}
                  onChange={set('org_name')}
                  placeholder="Community Food Bank of Example County"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
                <select
                  value={form.sector}
                  onChange={set('sector')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select sector…</option>
                  <option value="nonprofit">Nonprofit</option>
                  <option value="faith_based">Faith-Based</option>
                  <option value="government">Government</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => setForm((f) => ({ ...f, description: html }))}
                  placeholder="Briefly describe your organization's mission and who you serve…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Services Offered</label>
                <RichTextEditor
                  value={form.services}
                  onChange={(html) => setForm((f) => ({ ...f, services: html }))}
                  placeholder="e.g. Food assistance, housing support, job training…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={set('website')}
                  placeholder="https://yourorg.org"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="(555) 000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours of Operation</label>
                <input
                  type="text"
                  value={form.hours}
                  onChange={set('hours')}
                  placeholder="Mon–Fri 9am–5pm"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Location */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">Location</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={set('address')}
                  placeholder="123 Main Street"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={set('city')}
                    placeholder="Springfield"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={set('state')}
                    placeholder="IL"
                    maxLength={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={set('postal_code')}
                    placeholder="62704"
                    maxLength={10}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  placeholder="Jane Smith"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.contact_email}
                  onChange={set('contact_email')}
                  placeholder="jane@yourorg.org"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={form.contact_phone}
                  onChange={set('contact_phone')}
                  placeholder="(555) 000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            We&apos;ll review your request and follow up via email within 2–3 business days.
          </p>
        </form>
      </main>
    </div>
  )
}
