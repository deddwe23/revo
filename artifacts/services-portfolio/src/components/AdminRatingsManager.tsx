"use client"

import * as React from "react"
import { Star, Loader2, Trash2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")

interface RatingItem {
  id: number
  order_id: number
  customer_id: number
  rating: number
  review_text: string | null
  approved: boolean
  created_at: string
  package_name: string
  customer_name: string
  email: string
}

interface AdminRatingsManagerProps {
  onRefresh?: () => void
}

export function AdminRatingsManager({ onRefresh }: AdminRatingsManagerProps) {
  const [ratings, setRatings] = React.useState<RatingItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [actioningId, setActioningId] = React.useState<number | null>(null)

  const fetchRatings = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${BASE}/api/admin/ratings`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch ratings")
      }

      const data = (await response.json()) as { ratings: RatingItem[] }
      setRatings(data.ratings)
    } catch (error) {
      console.error("Error fetching ratings:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchRatings()
  }, [fetchRatings])

  const handleApprove = async (id: number) => {
    setActioningId(id)
    try {
      const response = await fetch(`/api/admin/ratings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ approved: true }),
      })

      if (!response.ok) {
        throw new Error("Failed to approve rating")
      }

      setRatings((prev) =>
        prev.map((r) => (r.id === id ? { ...r, approved: true } : r))
      )
      onRefresh?.()
    } catch (error) {
      console.error("Error approving rating:", error)
    } finally {
      setActioningId(null)
    }
  }

  const handleReject = async (id: number) => {
    setActioningId(id)
    try {
      const response = await fetch(`/api/admin/ratings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ approved: false }),
      })

      if (!response.ok) {
        throw new Error("Failed to reject rating")
      }

      setRatings((prev) =>
        prev.map((r) => (r.id === id ? { ...r, approved: false } : r))
      )
      onRefresh?.()
    } catch (error) {
      console.error("Error rejecting rating:", error)
    } finally {
      setActioningId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل تريد حذف هذا التقييم؟")) return

    setActioningId(id)
    try {
      const response = await fetch(`/api/admin/ratings/${id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to delete rating")
      }

      setRatings((prev) => prev.filter((r) => r.id !== id))
      onRefresh?.()
    } catch (error) {
      console.error("Error deleting rating:", error)
    } finally {
      setActioningId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (ratings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        لا توجد تقييمات حتى الآن
      </div>
    )
  }

  // Separate approved and pending
  const approved = ratings.filter((r) => r.approved)
  const pending = ratings.filter((r) => !r.approved)

  return (
    <div className="space-y-6">
      {/* Pending Ratings */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-amber-400">
            تقييمات بانتظار الموافقة ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((rating) => (
              <Card
                key={rating.id}
                className="p-4 border-amber-400/25 bg-amber-400/5"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < rating.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-400"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">
                        {rating.customer_name}
                      </span>
                    </div>

                    {rating.review_text && (
                      <p className="text-sm text-gray-300 mb-2">
                        "{rating.review_text}"
                      </p>
                    )}

                    <div className="text-xs text-gray-400 space-y-0.5">
                      <p>الطلب: {rating.package_name}</p>
                      <p>البريد: {rating.email}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(rating.id)}
                      disabled={actioningId === rating.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {actioningId === rating.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(rating.id)}
                      disabled={actioningId === rating.id}
                    >
                      {actioningId === rating.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved Ratings */}
      {approved.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-green-400">
            تقييمات موافق عليها ({approved.length})
          </h3>
          <div className="space-y-3">
            {approved.map((rating) => (
              <Card key={rating.id} className="p-4 border-green-400/25 bg-green-400/5">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < rating.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-400"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">
                        {rating.customer_name}
                      </span>
                    </div>

                    {rating.review_text && (
                      <p className="text-sm text-gray-300 mb-2">
                        "{rating.review_text}"
                      </p>
                    )}

                    <div className="text-xs text-gray-400 space-y-0.5">
                      <p>الطلب: {rating.package_name}</p>
                      <p>البريد: {rating.email}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(rating.id)}
                      disabled={actioningId === rating.id}
                    >
                      {actioningId === rating.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(rating.id)}
                      disabled={actioningId === rating.id}
                    >
                      {actioningId === rating.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
