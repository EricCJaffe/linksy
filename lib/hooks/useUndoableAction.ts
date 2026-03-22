'use client'

import { useCallback, useRef, createElement } from 'react'
import { useToast } from '@/hooks/use-toast'
import { ToastAction, type ToastActionElement } from '@/components/ui/toast'

const UNDO_WINDOW_MS = 5000

interface UndoableActionOptions {
  /** Description shown in the toast (e.g. "Status changed to In Process") */
  description: string
  /** The action to perform immediately */
  action: () => Promise<void> | void
  /** The action to revert if the user clicks Undo */
  undoAction: () => Promise<void> | void
  /** Optional callback after successful undo */
  onUndo?: () => void
}

/**
 * Hook that provides an `execute` function for actions that should be
 * immediately persisted but offer a brief "Undo" window via toast.
 *
 * Use for instant-save interactions like status dropdowns, privacy toggles,
 * and delete actions where there's no explicit Save button.
 */
export function useUndoableAction() {
  const { toast } = useToast()
  const pendingUndoRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const execute = useCallback(
    async ({ description, action, undoAction, onUndo }: UndoableActionOptions) => {
      // Clear any pending undo from a previous action
      if (pendingUndoRef.current) {
        clearTimeout(pendingUndoRef.current)
        pendingUndoRef.current = null
      }

      // Perform the action immediately
      await action()

      // Show toast with Undo button
      const { dismiss } = toast({
        description,
        action: createElement(
          ToastAction,
          {
            altText: 'Undo',
            onClick: async () => {
              if (pendingUndoRef.current) {
                clearTimeout(pendingUndoRef.current)
                pendingUndoRef.current = null
              }
              await undoAction()
              onUndo?.()
              dismiss()
            },
          },
          'Undo'
        ) as unknown as ToastActionElement,
        duration: UNDO_WINDOW_MS,
      })

      // Auto-dismiss after window expires
      pendingUndoRef.current = setTimeout(() => {
        pendingUndoRef.current = null
      }, UNDO_WINDOW_MS)
    },
    [toast]
  )

  return { execute }
}
