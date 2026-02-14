import { BrandingForm } from '@/components/settings/branding-form'
import { TerminologyEditor } from '@/components/settings/terminology-editor'

export function BrandingTab() {
  return (
    <>
      <div>
        <h2 className="text-2xl font-bold">Branding</h2>
        <p className="text-sm text-muted-foreground">
          Customize your organization's appearance and terminology
        </p>
      </div>

      <BrandingForm />
      <TerminologyEditor />
    </>
  )
}
