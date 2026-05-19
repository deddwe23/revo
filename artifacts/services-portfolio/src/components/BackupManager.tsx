"use client"

import * as React from "react"
import { Download, Upload, Loader2, CheckCircle2, XCircle, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")

interface Backup {
  id: string
  name: string
  size: number
  created_at: string
  status: "successful" | "failed" | "pending"
  type: "automatic" | "manual"
}

export function BackupManager() {
  const [backups, setBackups] = React.useState<Backup[]>([])
  const [loading, setLoading] = React.useState(false)
  const [backing, setBacking] = React.useState(false)

  const fetchBackups = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${BASE}/api/admin/backups`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json() as { backups: Backup[] }
        setBackups(data.backups)
      }
    } catch (error) {
      console.error("Error fetching backups:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    setBacking(true)
    try {
      const response = await fetch(`${BASE}/api/admin/backups`, {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json() as { backup: Backup }
        setBackups((prev) => [data.backup, ...prev])
      }
    } catch (error) {
      console.error("Error creating backup:", error)
    } finally {
      setBacking(false)
    }
  }

  const handleDownloadBackup = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/backups/${id}/download`, {
        credentials: "include",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `backup-${id}.sql`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Error downloading backup:", error)
    }
  }

  React.useEffect(() => {
    fetchBackups()
  }, [])

  return (
    <div className="space-y-6">
      {/* Create Backup */}
      <Card className="p-6 border-white/10 bg-white/5">
        <h3 className="font-bold text-lg mb-4">إنشاء نسخة احتياطية</h3>
        <p className="text-white/60 text-sm mb-4">
          احفظ جميع بيانات متجرك بأمان. يتم إنشاء نسخ احتياطية تلقائية يومياً
        </p>
        <Button
          onClick={handleCreateBackup}
          disabled={backing}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          {backing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري الإنشاء...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              إنشاء نسخة احتياطية الآن
            </>
          )}
        </Button>
      </Card>

      {/* Backups List */}
      <Card className="p-6 border-white/10 bg-white/5">
        <h3 className="font-bold text-lg mb-4">النسخ الاحتياطية</h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : backups.length === 0 ? (
          <p className="text-white/50 text-center py-4">لا توجد نسخ احتياطية حالياً</p>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="p-4 rounded-lg border border-white/10 bg-white/3 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{backup.name}</p>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">
                      {backup.type === "automatic" ? "تلقائية" : "يدوية"}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-white/50">
                    <span>
                      <Calendar className="inline-block mr-1 h-3 w-3" />
                      {new Date(backup.created_at).toLocaleDateString("ar-SA")}
                    </span>
                    <span>{(backup.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-1 text-sm",
                      backup.status === "successful"
                        ? "text-green-400"
                        : backup.status === "failed"
                          ? "text-red-400"
                          : "text-yellow-400"
                    )}
                  >
                    {backup.status === "successful" && (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {backup.status === "failed" && (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span>
                      {backup.status === "successful"
                        ? "ناجح"
                        : backup.status === "failed"
                          ? "فشل"
                          : "جاري"}
                    </span>
                  </div>

                  {backup.status === "successful" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 gap-1"
                      onClick={() => handleDownloadBackup(backup.id)}
                    >
                      <Download className="h-4 w-4" />
                      تحميل
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
