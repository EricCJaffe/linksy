'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react'
import { useNeedCategories } from '@/lib/hooks/useProviders'
import type { Sector, ProjectStatus, ReferralType } from '@/lib/types/linksy'

interface LocationData {
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  is_primary: boolean
}

interface ContactData {
  full_name: string
  email: string
  phone: string
  job_title: string
}

interface OnboardingData {
  // Step 1: Basic Info
  name: string
  description: string
  sector: Sector
  website: string
  phone: string
  email: string
  project_status: ProjectStatus
  referral_type: ReferralType
  referral_instructions: string

  // Step 2: Locations
  locations: LocationData[]

  // Step 3: Needs
  selectedNeeds: string[]

  // Step 4: Contact
  contact: ContactData
}

const STEPS = [
  { id: 1, title: 'Basic Information', description: 'Provider details' },
  { id: 2, title: 'Locations', description: 'Add service locations' },
  { id: 3, title: 'Services', description: 'What needs do you address?' },
  { id: 4, title: 'Primary Contact', description: 'Main point of contact' },
  { id: 5, title: 'Review', description: 'Review and submit' },
]

export default function NewProviderPage() {
  const router = useRouter()
  const { data: categories } = useNeedCategories()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<OnboardingData>({
    name: '',
    description: '',
    sector: 'nonprofit',
    website: '',
    phone: '',
    email: '',
    project_status: 'active',
    referral_type: 'standard',
    referral_instructions: '',
    locations: [{ address_line1: '', address_line2: '', city: '', state: '', zip: '', is_primary: true }],
    selectedNeeds: [],
    contact: { full_name: '', email: '', phone: '', job_title: '' },
  })

  const progress = (currentStep / STEPS.length) * 100

  const addLocation = () => {
    setFormData({
      ...formData,
      locations: [...formData.locations, { address_line1: '', address_line2: '', city: '', state: '', zip: '', is_primary: false }],
    })
  }

  const removeLocation = (index: number) => {
    const newLocations = formData.locations.filter((_, i) => i !== index)
    setFormData({ ...formData, locations: newLocations })
  }

  const updateLocation = (index: number, field: keyof LocationData, value: any) => {
    const newLocations = [...formData.locations]
    newLocations[index] = { ...newLocations[index], [field]: value }
    setFormData({ ...formData, locations: newLocations })
  }

  const toggleNeed = (needId: string) => {
    const newNeeds = formData.selectedNeeds.includes(needId)
      ? formData.selectedNeeds.filter(id => id !== needId)
      : [...formData.selectedNeeds, needId]
    setFormData({ ...formData, selectedNeeds: newNeeds })
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.sector
      case 2:
        return formData.locations.some(loc => loc.address_line1 && loc.city && loc.state)
      case 3:
        return formData.selectedNeeds.length > 0
      case 4:
        return formData.contact.full_name && formData.contact.email
      default:
        return true
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Create provider
      const providerRes = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          sector: formData.sector,
          website: formData.website,
          phone: formData.phone,
          email: formData.email,
          project_status: formData.project_status,
          referral_type: formData.referral_type,
          referral_instructions: formData.referral_instructions,
          is_active: true,
        }),
      })

      if (!providerRes.ok) throw new Error('Failed to create provider')
      const provider = await providerRes.json()

      // Create locations
      await Promise.all(
        formData.locations
          .filter(loc => loc.address_line1 && loc.city && loc.state)
          .map(location =>
            fetch(`/api/providers/${provider.id}/locations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(location),
            })
          )
      )

      // Create needs
      await Promise.all(
        formData.selectedNeeds.map(needId =>
          fetch(`/api/providers/${provider.id}/needs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ need_id: needId }),
          })
        )
      )

      // Create contact
      await fetch(`/api/providers/${provider.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.contact.email,
          job_title: formData.contact.job_title,
          phone: formData.contact.phone,
          provider_role: 'admin',
          is_primary_contact: true,
          is_default_referral_handler: true,
          contact_type: 'provider_employee',
        }),
      })

      router.push(`/dashboard/providers/${provider.id}`)
    } catch (error) {
      console.error('Error creating provider:', error)
      alert('Failed to create provider. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Add New Provider</h1>
        <p className="text-muted-foreground mt-1">
          Complete the steps below to onboard a new provider
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex-1 text-center ${
                currentStep === step.id ? 'font-semibold text-primary' : 'text-muted-foreground'
              }`}
            >
              Step {step.id}: {step.title}
            </div>
          ))}
        </div>
        <Progress value={progress} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Provider Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Community Food Bank"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(html) => setFormData({ ...formData, description: html })}
                  placeholder="Brief description of the organization..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector">Sector *</Label>
                  <Select
                    value={formData.sector}
                    onValueChange={(value) => setFormData({ ...formData, sector: value as Sector })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nonprofit">Nonprofit</SelectItem>
                      <SelectItem value="faith_based">Faith Based</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_status">Project Status</Label>
                  <Select
                    value={formData.project_status}
                    onValueChange={(value) => setFormData({ ...formData, project_status: value as ProjectStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="sustaining">Sustaining</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="na">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@provider.org"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://provider.org"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral_type">Referral Type</Label>
                <Select
                  value={formData.referral_type}
                  onValueChange={(value) => setFormData({ ...formData, referral_type: value as ReferralType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="contact_directly">Contact Directly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.referral_type === 'contact_directly' && (
                <div className="space-y-2">
                  <Label htmlFor="referral_instructions">Referral Instructions</Label>
                  <RichTextEditor
                    value={formData.referral_instructions}
                    onChange={(html) => setFormData({ ...formData, referral_instructions: html })}
                    placeholder="Instructions for contacting this organization..."
                  />
                </div>
              )}
            </>
          )}

          {/* Step 2: Locations */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {formData.locations.map((location, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">
                      Location {index + 1}
                      {location.is_primary && <Badge className="ml-2">Primary</Badge>}
                    </h3>
                    {formData.locations.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLocation(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Address Line 1 *</Label>
                      <Input
                        value={location.address_line1}
                        onChange={(e) => updateLocation(index, 'address_line1', e.target.value)}
                        placeholder="123 Main Street"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Address Line 2</Label>
                      <Input
                        value={location.address_line2}
                        onChange={(e) => updateLocation(index, 'address_line2', e.target.value)}
                        placeholder="Suite 100"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>City *</Label>
                        <Input
                          value={location.city}
                          onChange={(e) => updateLocation(index, 'city', e.target.value)}
                          placeholder="Springfield"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>State *</Label>
                        <Input
                          value={location.state}
                          onChange={(e) => updateLocation(index, 'state', e.target.value)}
                          placeholder="IL"
                          maxLength={2}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>ZIP</Label>
                        <Input
                          value={location.zip}
                          onChange={(e) => updateLocation(index, 'zip', e.target.value)}
                          placeholder="62701"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={location.is_primary}
                        onCheckedChange={(checked) => {
                          // Unset other primary locations
                          const newLocations = formData.locations.map((loc, i) => ({
                            ...loc,
                            is_primary: i === index ? (checked as boolean) : false,
                          }))
                          setFormData({ ...formData, locations: newLocations })
                        }}
                      />
                      <Label>Primary Location</Label>
                    </div>
                  </div>
                </Card>
              ))}

              <Button
                variant="outline"
                onClick={addLocation}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Location
              </Button>
            </div>
          )}

          {/* Step 3: Services/Needs */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select all the services or needs this provider addresses:
              </p>
              {categories?.map((category) => (
                <div key={category.id} className="space-y-2">
                  <h3 className="flex items-center gap-2 font-medium">
                    {category.name}
                    {category.airs_code && (
                      <span className="font-mono text-xs font-normal text-muted-foreground">{category.airs_code}</span>
                    )}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 ml-4">
                    {category.needs?.map((need) => (
                      <div key={need.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.selectedNeeds.includes(need.id)}
                          onCheckedChange={() => toggleNeed(need.id)}
                        />
                        <Label className="font-normal cursor-pointer" onClick={() => toggleNeed(need.id)}>
                          {need.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Primary Contact */}
          {currentStep === 4 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Full Name *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact.full_name}
                  onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, full_name: e.target.value } })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact.email}
                  onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, email: e.target.value } })}
                  placeholder="john@provider.org"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact.phone}
                  onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, phone: e.target.value } })}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_title">Job Title</Label>
                <Input
                  id="contact_title"
                  value={formData.contact.job_title}
                  onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, job_title: e.target.value } })}
                  placeholder="Executive Director"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-medium mb-1">📧 Invitation Email</p>
                <p className="text-muted-foreground">
                  An invitation email will be sent to this contact to set up their account and access the provider portal.
                </p>
              </div>
            </>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Basic Information</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Name:</dt>
                  <dd className="font-medium">{formData.name}</dd>
                  <dt className="text-muted-foreground">Sector:</dt>
                  <dd className="capitalize">{formData.sector.replace('_', ' ')}</dd>
                  <dt className="text-muted-foreground">Website:</dt>
                  <dd>{formData.website || 'N/A'}</dd>
                  <dt className="text-muted-foreground">Phone:</dt>
                  <dd>{formData.phone || 'N/A'}</dd>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Locations ({formData.locations.filter(l => l.address_line1).length})</h3>
                {formData.locations.filter(l => l.address_line1).map((loc, i) => (
                  <p key={i} className="text-sm">
                    {loc.address_line1}, {loc.city}, {loc.state} {loc.zip}
                    {loc.is_primary && <Badge className="ml-2">Primary</Badge>}
                  </p>
                ))}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Services ({formData.selectedNeeds.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.selectedNeeds.map((needId) => {
                    const need = categories?.flatMap(c => c.needs || []).find(n => n.id === needId)
                    return <Badge key={needId} variant="outline">{need?.name}</Badge>
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Primary Contact</h3>
                <p className="text-sm">
                  {formData.contact.full_name} ({formData.contact.email})
                  {formData.contact.job_title && ` - ${formData.contact.job_title}`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(currentStep - 1)}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {currentStep < STEPS.length ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Provider
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
