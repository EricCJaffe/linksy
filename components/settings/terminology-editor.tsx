'use client'

import { useState, useEffect } from 'react'
import { useCurrentTenant, useUpdateTenant } from '@/lib/hooks/useCurrentTenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DEFAULT_TERMINOLOGY } from '@/lib/constants/terminology'

export function TerminologyEditor() {
  const { data: tenantData, isLoading } = useCurrentTenant()
  const { mutate: updateTenant, isPending } = useUpdateTenant()

  const initialTerminology = tenantData?.tenant?.settings?.terminology || {}

  // State for custom terms - stores both singular and plural
  const [customTerms, setCustomTerms] = useState<Record<string, string>>(initialTerminology)
  const [hasChanges, setHasChanges] = useState(false)

  // Update state when tenant data loads
  useEffect(() => {
    if (tenantData?.tenant?.settings?.terminology) {
      setCustomTerms(tenantData.tenant.settings.terminology)
    }
  }, [tenantData])

  const updateTerm = (key: string, value: string) => {
    setCustomTerms({
      ...customTerms,
      [key]: value,
    })
    setHasChanges(true)
  }

  const handleSave = () => {
    if (!tenantData?.tenant?.id) return

    // Filter out empty values
    const terminology = Object.entries(customTerms).reduce((acc, [key, value]) => {
      if (value && value.trim()) {
        acc[key] = value.trim()
      }
      return acc
    }, {} as Record<string, string>)

    updateTenant({
      id: tenantData.tenant.id,
      settings: {
        ...tenantData.tenant.settings,
        terminology,
      },
    })

    setHasChanges(false)
  }

  const handleReset = () => {
    setCustomTerms(initialTerminology)
    setHasChanges(false)
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Terminology</CardTitle>
        <CardDescription>
          Customize how system terms appear throughout your organization. Leave blank to use defaults.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">System Term</TableHead>
              <TableHead className="w-[200px]">Default Label</TableHead>
              <TableHead className="w-[200px]">Custom Label</TableHead>
              <TableHead>Used In</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEFAULT_TERMINOLOGY.map((term) => (
              <>
                {/* Singular form */}
                <TableRow key={term.key}>
                  <TableCell className="font-medium">{term.key}</TableCell>
                  <TableCell className="text-muted-foreground">{term.defaultSingular}</TableCell>
                  <TableCell>
                    <Input
                      placeholder={term.defaultSingular}
                      value={customTerms[term.key] || ''}
                      onChange={(e) => updateTerm(term.key, e.target.value)}
                      className="max-w-[200px]"
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {term.usedIn.join(', ')}
                  </TableCell>
                </TableRow>
                {/* Plural form */}
                <TableRow key={`${term.key}_plural`}>
                  <TableCell className="font-medium">{term.key} (plural)</TableCell>
                  <TableCell className="text-muted-foreground">{term.defaultPlural}</TableCell>
                  <TableCell>
                    <Input
                      placeholder={term.defaultPlural}
                      value={customTerms[`${term.key}_plural`] || ''}
                      onChange={(e) => updateTerm(`${term.key}_plural`, e.target.value)}
                      className="max-w-[200px]"
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {term.usedIn.join(', ')}
                  </TableCell>
                </TableRow>
              </>
            ))}
          </TableBody>
        </Table>

        {DEFAULT_TERMINOLOGY.length > 0 && (
          <div className="mt-4 p-4 rounded-md bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Custom labels will replace default terms throughout the application.
              For example, changing "User" to "Team Member" will update all references in navigation,
              pages, and forms.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isPending || !hasChanges}
        >
          Reset Changes
        </Button>
        <Button onClick={handleSave} disabled={isPending || !hasChanges}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardFooter>
    </Card>
  )
}
