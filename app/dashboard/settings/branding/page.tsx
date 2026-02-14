import { BrandingForm } from '@/components/settings/branding-form'
import { TerminologyEditor } from '@/components/settings/terminology-editor'

export default function BrandingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Branding</h1>
        <p className="text-muted-foreground">Customize your organization appearance</p>
      </div>

      <BrandingForm />
      <TerminologyEditor />
    </div>
  )
}
