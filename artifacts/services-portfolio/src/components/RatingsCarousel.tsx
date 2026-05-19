"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Rating {
  id: number
  rating: number
  review_text: string | null
  customer_id: number
  created_at: string
}

interface RatingsCarouselProps {
  ratings: Rating[]
  autoplay?: boolean
  autoplayDelay?: number
  className?: string
}

export function RatingsCarousel({
  ratings,
  autoplay = true,
  autoplayDelay = 5000,
  className,
}: RatingsCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Auto-play timer
  React.useEffect(() => {
    if (!autoplay || ratings.length === 0) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ratings.length)
    }, autoplayDelay)

    return () => clearInterval(timer)
  }, [autoplay, autoplayDelay, ratings.length])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + ratings.length) % ratings.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % ratings.length)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    setIsDragging(true)
    setDragStart(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const dragEnd = e.clientX
    const diff = dragStart - dragEnd

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext()
      } else {
        handlePrev()
      }
      setIsDragging(false)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setDragStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return

    const touchEnd = e.touches[0].clientX
    const diff = dragStart - touchEnd

    if (Math.abs(diff) > 30) {
      if (diff > 0) {
        handleNext()
      } else {
        handlePrev()
      }
      setIsDragging(false)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  if (!ratings || ratings.length === 0) {
    return null
  }

  const itemsPerView = {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  }

  return (
    <div
      className={cn("w-full", className)}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Carousel Container */}
      <div className="relative overflow-hidden px-2 md:px-4">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(${
              -currentIndex * (100 / itemsPerView.desktop)
            }%)`,
          }}
        >
          {ratings.map((rating) => (
            <div
              key={rating.id}
              className="min-w-full md:min-w-1/2 lg:min-w-1/3 px-2 md:px-3 flex-shrink-0"
            >
              <Card className="h-full p-6 flex flex-col justify-between border-white/10 bg-white/5 hover:border-primary/30 transition-colors cursor-grab active:cursor-grabbing">
                <div>
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4 pointer-events-none",
                          i < rating.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-white/20"
                        )}
                      />
                    ))}
                  </div>
                  {rating.review_text && (
                    <p className="text-white/70 text-sm mb-4 min-h-[3rem] leading-relaxed pointer-events-none select-none">
                      "{rating.review_text}"
                    </p>
                  )}
                </div>
                <div className="text-xs text-white/40 pointer-events-none">
                  {new Date(rating.created_at).toLocaleDateString("ar-SA")}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-center items-center gap-4 mt-8">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handlePrev}
          className="h-10 w-10 rounded-full border-white/20 text-white/70 hover:bg-primary/20 hover:text-primary disabled:opacity-30"
          aria-label="Previous rating"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Indicator Dots */}
        <div className="flex gap-2">
          {ratings.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                index === currentIndex ? "bg-primary w-8" : "bg-white/20 hover:bg-white/40"
              )}
              aria-label={`Go to rating ${index + 1}`}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="h-10 w-10 rounded-full border-white/20 text-white/70 hover:bg-primary/20 hover:text-primary disabled:opacity-30"
          aria-label="Next rating"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Hint text */}
      <p className="text-center text-xs text-white/40 mt-4 pointer-events-none">
        🖐️ اسحب لليسار واليمين لعرض المزيد من التقييمات
      </p>
    </div>
  )
}
