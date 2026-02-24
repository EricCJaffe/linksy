'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Phone, Clock, User, Mail, Calendar, AlertCircle } from 'lucide-react'
import type { CallLogData, CallOutcome } from '@/lib/types/linksy'

interface CallLogDisplayProps {
  callLogData: CallLogData
  content: string
  createdAt: string
}

const outcomeColors: Record<CallOutcome, string> = {
  answered: 'bg-green-100 text-green-800 border-green-200',
  voicemail: 'bg-blue-100 text-blue-800 border-blue-200',
  no_answer: 'bg-amber-100 text-amber-800 border-amber-200',
  busy: 'bg-orange-100 text-orange-800 border-orange-200',
  disconnected: 'bg-red-100 text-red-800 border-red-200',
  wrong_number: 'bg-slate-100 text-slate-800 border-slate-200',
}

const outcomeLabels: Record<CallOutcome, string> = {
  answered: 'Answered',
  voicemail: 'Voicemail',
  no_answer: 'No Answer',
  busy: 'Busy',
  disconnected: 'Disconnected',
  wrong_number: 'Wrong Number',
}

export function CallLogDisplay({ callLogData, content, createdAt }: CallLogDisplayProps) {
  return (
    <div className="space-y-3">
      {/* Header with outcome and duration */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={outcomeColors[callLogData.call_outcome]}>
          <Phone className="h-3 w-3 mr-1" />
          {outcomeLabels[callLogData.call_outcome]}
        </Badge>

        {callLogData.duration_minutes !== undefined && callLogData.duration_minutes > 0 && (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
            <Clock className="h-3 w-3 mr-1" />
            {callLogData.duration_minutes} min
          </Badge>
        )}

        {callLogData.follow_up_required && (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Follow-up needed
          </Badge>
        )}
      </div>

      {/* Caller information */}
      {(callLogData.caller_name || callLogData.caller_phone || callLogData.caller_email) && (
        <Card className="border-slate-200 bg-slate-50/50">
          <CardContent className="p-3 space-y-1">
            <p className="text-xs font-medium text-slate-600 mb-2">Caller Information</p>
            {callLogData.caller_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3 w-3 text-slate-500" />
                <span>{callLogData.caller_name}</span>
              </div>
            )}
            {callLogData.caller_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3 w-3 text-slate-500" />
                <a href={`tel:${callLogData.caller_phone}`} className="hover:underline">
                  {callLogData.caller_phone}
                </a>
              </div>
            )}
            {callLogData.caller_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3 w-3 text-slate-500" />
                <a href={`mailto:${callLogData.caller_email}`} className="hover:underline">
                  {callLogData.caller_email}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Call notes */}
      {content && content !== 'Call log entry' && (
        <div className="text-sm">
          <p className="font-medium text-slate-700 mb-1">Notes:</p>
          <p className="text-slate-600 whitespace-pre-wrap">{content}</p>
        </div>
      )}

      {/* Follow-up information */}
      {callLogData.follow_up_required && callLogData.follow_up_date && (
        <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
          <Calendar className="h-4 w-4" />
          <span>
            Follow-up by: {new Date(callLogData.follow_up_date).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  )
}
