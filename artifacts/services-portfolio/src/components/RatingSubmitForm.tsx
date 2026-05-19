"use client"

import * as React from "react"
import { Star, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")

interface RatingSubmitFormProps {
  orderId: number
  onSuccess?: () => void
  className?: string
}

export function RatingSubmitForm({
  orderId,
  onSuccess,
  className,
}: RatingSubmitFormProps) {
  const [rating, setRating] = React.useState(0)
  const [hoverRating, setHoverRating] = React.useState(0)
  const [reviewText, setReviewText] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      setMessage({ type: "error", text: "يرجى اختيار التقييم" })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${BASE}/api/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId,
          rating,
          reviewText: reviewText.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "حدث خطأ في إرسال التقييم")
      }

      setMessage({
        type: "success",
        text: "شكراً لتقييمك! تم إرسال التقييم وسيتم مراجعته",
      })
      setRating(0)
      setReviewText("")

      if (onSuccess) {
        setTimeout(onSuccess, 1500)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "حدث خطأ غير متوقع"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={cn("p-6", className)}>
      <h3 className="text-lg font-semibold mb-4">قيّم الخدمة</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating */}
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const starValue = i + 1
            return (
              <button
                key={i}
                type="button"
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    starValue <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  )}
                />
              </button>
            )
          })}
        </div>

        {/* Review Text */}
        <div>
          <label className="block text-sm font-medium mb-2">
            شارك رأيك (اختياري)
          </label>
          <Textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="أخبرنا رأيك عن الخدمة..."
            maxLength={500}
            rows={4}
            disabled={isLoading}
            className="resize-none"
          />
          <div className="text-xs text-gray-500 mt-1">
            {reviewText.length}/500
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={cn(
              "p-3 rounded-md text-sm",
              message.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            )}
          >
            {message.text}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              جاري الإرسال...
            </>
          ) : (
            "إرسال التقييم"
          )}
        </Button>
      </form>
    </Card>
  )
}
