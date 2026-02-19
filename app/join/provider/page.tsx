'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react'
import { RichTextEditor } from '@/components/ui/rich-text-editor'

/* ─── Types ─── */

interface LocationData {
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  is_primary: boolean
}

interface NeedCategory {
  id: string
  name: string
  airs_code?: string
  needs?: { id: string; name: string }[]
}

interface FormData {
  // Step 1
  org_name: string
  sector: string
  description: string
  phone: string
  email: string
  website: string
  hours: string
  referral_type: string
  referral_instructions: string
  // Step 2
  locations: LocationData[]
  // Step 3
  selectedNeeds: string[]
  // Step 4
  contact_name: string
  contact_email: string
  contact_phone: string
  contact_job_title: string
}

const STEPS = [
  { id: 1, title: 'Basic Info' },
  { id: 2, title: 'Locations' },
  { id: 3, title: 'Services' },
  { id: 4, title: 'Contact' },
  { id: 5, title: 'Review' },
]

const INPUT =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const SELECT = `${INPUT} bg-white`

export default function ProviderOnboardingPage() {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<NeedCategory[]>([])

  const [form, setForm] = useState<FormData>({
    org_name: '',
    sector: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    hours: '',
    referral_type: 'standard',
    referral_instructions: '',
    locations: [
      { address_line1: '', address_line2: '', city: '', state: '', zip: '', is_primary: true },
    ],
    selectedNeeds: [],
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contact_job_title: '',
  })

  // Fetch public need categories
  useEffect(() => {
    fetch('/api/public/need-categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data)
      })
      .catch(() => {})
  }, [])

  /* ─── Helpers ─── */

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const updateLocation = (index: number, field: keyof LocationData, value: string | boolean) => {
    setForm((f) => {
      const locations = [...f.locations]
      locations[index] = { ...locations[index], [field]: value }
      return { ...f, locations }
    })
  }

  const addLocation = () => {
    setForm((f) => ({
      ...f,
      locations: [
        ...f.locations,
        { address_line1: '', address_line2: '', city: '', state: '', zip: '', is_primary: false },
      ],
    }))
  }

  const removeLocation = (index: number) => {
    setForm((f) => ({ ...f, locations: f.locations.filter((_, i) => i !== index) }))
  }

  const setPrimaryLocation = (index: number) => {
    setForm((f) => ({
      ...f,
      locations: f.locations.map((loc, i) => ({ ...loc, is_primary: i === index })),
    }))
  }

  const toggleNeed = (needId: string) => {
    setForm((f) => ({
      ...f,
      selectedNeeds: f.selectedNeeds.includes(needId)
        ? f.selectedNeeds.filter((id) => id !== needId)
        : [...f.selectedNeeds, needId],
    }))
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return form.org_name.trim() !== ''
      case 2:
        return true // locations are optional
      case 3:
        return true // needs are optional
      case 4:
        return form.contact_name.trim() !== '' && form.contact_email.trim() !== ''
      default:
        return true
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: form.org_name,
          sector: form.sector,
          description: form.description,
          phone: form.phone,
          email: form.email,
          website: form.website,
          hours: form.hours,
          referral_type: form.referral_type,
          referral_instructions: form.referral_instructions,
          locations: form.locations.filter((l) => l.address_line1 || l.city),
          selected_needs: form.selectedNeeds,
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          contact_job_title: form.contact_job_title,
          // Backward compat: flat address from first location
          address: form.locations[0]?.address_line1 || '',
          city: form.locations[0]?.city || '',
          state: form.locations[0]?.state || '',
          postal_code: form.locations[0]?.zip || '',
          services: '', // kept for backward compat; needs are in selected_needs
        }),
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

  /* ─── Success Screen ─── */

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted!</h2>
          <p className="text-gray-500 mb-6">
            Thank you for your interest in being listed on Linksy. Our team will review your
            application and reach out to <strong>{form.contact_email}</strong> within 2–3 business
            days.
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

  /* ─── Wizard Layout ─── */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-blue-600">
            Linksy
          </Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900">
            Sign In
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Request to Be Listed</h1>
          <p className="mt-2 text-gray-500">
            Tell us about your organization and we&apos;ll review your request to be added to the
            Linksy resource directory.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s) => (
            <div key={s.id} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  s.id <= step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
              <p
                className={`text-xs mt-1 text-center ${
                  s.id === step ? 'text-blue-600 font-semibold' : 'text-gray-400'
                }`}
              >
                {s.title}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <section className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">
                Organization Information
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.org_name}
                  onChange={set('org_name')}
                  placeholder="Community Food Bank of Example County"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
                <select value={form.sector} onChange={set('sector')} className={SELECT}>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="(555) 000-0000"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="info@yourorg.org"
                    className={INPUT}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={set('website')}
                  placeholder="https://yourorg.org"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours of Operation
                </label>
                <input
                  type="text"
                  value={form.hours}
                  onChange={set('hours')}
                  placeholder="Mon–Fri 9am–5pm"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referral Type
                </label>
                <select
                  value={form.referral_type}
                  onChange={set('referral_type')}
                  className={SELECT}
                >
                  <option value="standard">Standard</option>
                  <option value="contact_directly">Contact Directly</option>
                </select>
              </div>
              {form.referral_type === 'contact_directly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referral Instructions
                  </label>
                  <RichTextEditor
                    value={form.referral_instructions}
                    onChange={(html) => setForm((f) => ({ ...f, referral_instructions: html }))}
                    placeholder="How should people contact your organization for referrals?"
                  />
                </div>
              )}
            </section>
          )}

          {/* Step 2: Locations */}
          {step === 2 && (
            <section className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">
                Service Locations
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Add the locations where your organization provides services. You can add multiple
                locations.
              </p>

              {form.locations.map((loc, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Location {i + 1}
                      {loc.is_primary && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                    </span>
                    {form.locations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLocation(i)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={loc.address_line1}
                      onChange={(e) => updateLocation(i, 'address_line1', e.target.value)}
                      placeholder="123 Main Street"
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={loc.address_line2}
                      onChange={(e) => updateLocation(i, 'address_line2', e.target.value)}
                      placeholder="Suite 100"
                      className={INPUT}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">City</label>
                      <input
                        type="text"
                        value={loc.city}
                        onChange={(e) => updateLocation(i, 'city', e.target.value)}
                        placeholder="Springfield"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">State</label>
                      <input
                        type="text"
                        value={loc.state}
                        onChange={(e) => updateLocation(i, 'state', e.target.value)}
                        placeholder="IL"
                        maxLength={2}
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">ZIP</label>
                      <input
                        type="text"
                        value={loc.zip}
                        onChange={(e) => updateLocation(i, 'zip', e.target.value)}
                        placeholder="62704"
                        maxLength={10}
                        className={INPUT}
                      />
                    </div>
                  </div>
                  {!loc.is_primary && (
                    <button
                      type="button"
                      onClick={() => setPrimaryLocation(i)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Set as primary location
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addLocation}
                className="w-full border border-dashed border-gray-300 rounded-lg py-2.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Another Location
              </button>
            </section>
          )}

          {/* Step 3: Services / Needs */}
          {step === 3 && (
            <section className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">
                Services &amp; Needs
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Select all the services or needs your organization addresses:
              </p>

              {categories.length === 0 && (
                <p className="text-sm text-gray-400 italic">Loading categories…</p>
              )}

              {categories.map((cat) => (
                <div key={cat.id} className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {cat.name}
                    {cat.airs_code && (
                      <span className="ml-2 font-mono text-xs font-normal text-gray-400">
                        {cat.airs_code}
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 ml-2">
                    {cat.needs?.map((need) => (
                      <label
                        key={need.id}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.selectedNeeds.includes(need.id)}
                          onChange={() => toggleNeed(need.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {need.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {form.selectedNeeds.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  {form.selectedNeeds.length} service{form.selectedNeeds.length !== 1 && 's'}{' '}
                  selected
                </p>
              )}
            </section>
          )}

          {/* Step 4: Primary Contact */}
          {step === 4 && (
            <section className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">
                Primary Contact
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.contact_name}
                  onChange={set('contact_name')}
                  placeholder="Jane Smith"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={form.contact_email}
                  onChange={set('contact_email')}
                  placeholder="jane@yourorg.org"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.contact_phone}
                  onChange={set('contact_phone')}
                  placeholder="(555) 000-0000"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={form.contact_job_title}
                  onChange={set('contact_job_title')}
                  placeholder="Executive Director"
                  className={INPUT}
                />
              </div>
            </section>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <section className="space-y-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">
                Review Your Application
              </h2>

              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Organization</h3>
                <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-gray-400">Name</dt>
                  <dd className="text-gray-900">{form.org_name}</dd>
                  {form.sector && (
                    <>
                      <dt className="text-gray-400">Sector</dt>
                      <dd className="text-gray-900 capitalize">
                        {form.sector.replace('_', ' ')}
                      </dd>
                    </>
                  )}
                  {form.phone && (
                    <>
                      <dt className="text-gray-400">Phone</dt>
                      <dd className="text-gray-900">{form.phone}</dd>
                    </>
                  )}
                  {form.website && (
                    <>
                      <dt className="text-gray-400">Website</dt>
                      <dd className="text-gray-900">{form.website}</dd>
                    </>
                  )}
                  {form.hours && (
                    <>
                      <dt className="text-gray-400">Hours</dt>
                      <dd className="text-gray-900">{form.hours}</dd>
                    </>
                  )}
                  <dt className="text-gray-400">Referral</dt>
                  <dd className="text-gray-900 capitalize">
                    {form.referral_type.replace('_', ' ')}
                  </dd>
                </dl>
              </div>

              {/* Locations */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Locations (
                  {form.locations.filter((l) => l.address_line1 || l.city).length})
                </h3>
                {form.locations
                  .filter((l) => l.address_line1 || l.city)
                  .map((loc, i) => (
                    <p key={i} className="text-sm text-gray-900">
                      {[loc.address_line1, loc.city, loc.state, loc.zip]
                        .filter(Boolean)
                        .join(', ')}
                      {loc.is_primary && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                    </p>
                  ))}
                {form.locations.filter((l) => l.address_line1 || l.city).length === 0 && (
                  <p className="text-sm text-gray-400 italic">No locations added</p>
                )}
              </div>

              {/* Services */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Services ({form.selectedNeeds.length})
                </h3>
                {form.selectedNeeds.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {form.selectedNeeds.map((needId) => {
                      const need = categories
                        .flatMap((c) => c.needs || [])
                        .find((n) => n.id === needId)
                      return (
                        <span
                          key={needId}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                        >
                          {need?.name || needId}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No services selected</p>
                )}
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Primary Contact</h3>
                <p className="text-sm text-gray-900">
                  {form.contact_name} &mdash; {form.contact_email}
                  {form.contact_job_title && ` (${form.contact_job_title})`}
                </p>
                {form.contact_phone && (
                  <p className="text-sm text-gray-500">{form.contact_phone}</p>
                )}
              </div>
            </section>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          We&apos;ll review your application and follow up via email within 2–3 business days.
        </p>
      </main>
    </div>
  )
}
