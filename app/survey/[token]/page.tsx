'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star } from 'lucide-react'

interface SurveyData {
  id: string
  token: string
  rating: number | null
  feedback_text: string | null
  completed_at: string | null
}

export default function SurveyPage({ params }: { params: { token: string } }) {
  const [survey, setSurvey] = useState<SurveyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSurvey()
  }, [])

  const fetchSurvey = async () => {
    try {
      const res = await fetch(`/api/surveys/${params.token}`)
      if (res.ok) {
        const data = await res.json()
        setSurvey(data)
        if (data.completed_at) setIsSubmitted(true)
      } else {
        setError('Survey not found or has expired.')
      }
    } catch {
      setError('Failed to load survey.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (rating === 0) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/surveys/${params.token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback_text: feedback }),
      })
      if (res.ok) {
        setIsSubmitted(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to submit survey.')
      }
    } catch {
      setError('Failed to submit survey.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <h2 className="text-xl font-semibold">Thank You!</h2>
            <p className="text-muted-foreground">
              Your feedback has been recorded. We appreciate you taking the time to share your experience.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>How was your experience?</CardTitle>
          <p className="text-sm text-muted-foreground">
            We'd love your feedback on the referral service you received.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 ${
                    star <= (hoverRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          <div>
            <Textarea
              placeholder="Tell us more about your experience (optional)..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
