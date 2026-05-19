"use client"

import * as React from "react"
import { Settings, Plus, Trash2, Copy, Loader2, Eye, EyeOff, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")

interface AutomationRule {
  id: number
  name: string
  trigger: string
  action: string
  action_data: string | null
  enabled: boolean
  created_at: string
}

const TRIGGERS = [
  { value: "order_created", label: "إنشاء طلب جديد" },
  { value: "order_completed", label: "اكتمال الطلب" },
  { value: "order_status_changed", label: "تغير حالة الطلب" },
  { value: "customer_signup", label: "تسجيل عميل جديد" },
  { value: "rating_submitted", label: "إضافة تقييم" },
  { value: "payment_received", label: "استقبال دفعة" },
]

const ACTIONS = [
  { value: "send_email", label: "إرسال بريد إلكتروني" },
  { value: "send_sms", label: "إرسال رسالة نصية" },
  { value: "send_whatsapp", label: "إرسال WhatsApp" },
  { value: "add_coupon", label: "إضافة كوبون مجاني" },
  { value: "create_follow_up_task", label: "إنشاء متابعة" },
]

export function AutomationManager() {
  const [rules, setRules] = React.useState<AutomationRule[]>([])
  const [loading, setLoading] = React.useState(true)
  const [creating, setCreating] = React.useState(false)
  const [editing, setEditing] = React.useState<AutomationRule | null>(null)
  const [automationNotice, setAutomationNotice] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  const [formData, setFormData] = React.useState({
    name: "",
    trigger: "order_completed",
    action: "send_email",
    actionData: "",
  })
  const [waForm, setWaForm] = React.useState({ to: "", message: "" })
  const [sendingWa, setSendingWa] = React.useState(false)
  const [waNotice, setWaNotice] = React.useState<{ type: "success" | "error"; text: string } | null>(null)
  const [waConnectLoading, setWaConnectLoading] = React.useState(false)
  const [waRefreshLoading, setWaRefreshLoading] = React.useState(false)
  const [waWebState, setWaWebState] = React.useState<{
    state: string
    connected: boolean
    qrAvailable: boolean
    qrImageDataUrl: string | null
    lastError: string | null
  } | null>(null)

  const resetForm = React.useCallback(() => {
    setFormData({
      name: "",
      trigger: "order_completed",
      action: "send_email",
      actionData: "",
    })
    setEditing(null)
  }, [])

  const fetchRules = React.useCallback(async () => {
    setLoading(true)
    setAutomationNotice(null)
    try {
      const response = await fetch(`${BASE}/api/admin/automations`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = (await response.json()) as { automations: AutomationRule[] }
        setRules(data.automations || [])
      } else {
        const payload = await response.json().catch(() => ({} as any))
        setAutomationNotice({ type: "error", text: payload?.error || "تعذر جلب قواعد الأتمتة" })
      }
    } catch (error) {
      console.error("Error fetching automation rules:", error)
      setAutomationNotice({ type: "error", text: "تعذر الاتصال بالسيرفر أثناء جلب قواعد الأتمتة" })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const fetchWhatsAppWebStatus = React.useCallback(async () => {
    try {
      const response = await fetch(`${BASE}/api/admin/whatsapp-web/status`, {
        credentials: "include",
      })
      if (!response.ok) return
      const data = await response.json() as {
        whatsappWeb: {
          state: string
          connected: boolean
          qrAvailable: boolean
          qrImageDataUrl: string | null
          lastError: string | null
        }
      }
      setWaWebState(data.whatsappWeb)
    } catch (error) {
      console.error("Error fetching WhatsApp Web status:", error)
    }
  }, [])

  React.useEffect(() => {
    void fetchWhatsAppWebStatus()
  }, [fetchWhatsAppWebStatus])

  React.useEffect(() => {
    if (!waWebState || waWebState.connected) return
    if (waWebState.state !== "qr" && waWebState.state !== "connecting") return

    const timer = setInterval(() => {
      void fetchWhatsAppWebStatus()
    }, 4000)

    return () => clearInterval(timer)
  }, [waWebState, fetchWhatsAppWebStatus])

  const handleConnectWhatsAppWeb = async () => {
    setWaConnectLoading(true)
    try {
      const response = await fetch(`${BASE}/api/admin/whatsapp-web/connect`, {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json() as {
          whatsappWeb: {
            state: string
            connected: boolean
            qrAvailable: boolean
            qrImageDataUrl: string | null
            lastError: string | null
          }
        }
        setWaWebState(data.whatsappWeb)
      }
    } catch (error) {
      console.error("Error connecting WhatsApp Web:", error)
    } finally {
      setWaConnectLoading(false)
    }
  }

  const handleDisconnectWhatsApp = async () => {
    setWaRefreshLoading(true)
    setWaNotice(null)
    try {
      const response = await fetch(`${BASE}/api/admin/whatsapp-web/disconnect`, {
        method: "POST",
        credentials: "include",
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        setWaNotice({ type: "error", text: data?.error || "تعذر إلغاء الاتصال الحالي" })
        return
      }

      if (data?.whatsappWeb) {
        setWaWebState(data.whatsappWeb)
      }
      setWaNotice({ type: "success", text: "تم إلغاء الكود القديم. الحالة الآن: غير متصل" })
    } catch (error) {
      console.error("Error disconnecting WhatsApp Web:", error)
      setWaNotice({ type: "error", text: "تعذر الاتصال بالسيرفر أثناء إلغاء الاتصال" })
    } finally {
      setWaRefreshLoading(false)
    }
  }

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setAutomationNotice(null)

    try {
      const isEditing = Boolean(editing)
      const response = await fetch(`${BASE}/api/admin/automations${editing ? `/${editing.id}` : ""}`, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          trigger: formData.trigger,
          action: formData.action,
          actionData: formData.actionData,
          enabled: editing?.enabled,
        }),
      })

      if (response.ok) {
        const data = await response.json() as { automation: AutomationRule }
        if (editing) {
          setRules((prev) => prev.map((rule) => rule.id === data.automation.id ? data.automation : rule))
          setAutomationNotice({ type: "success", text: "تم تعديل قاعدة الأتمتة بنجاح" })
        } else {
          setRules((prev) => [data.automation, ...prev])
          setAutomationNotice({ type: "success", text: "تم إنشاء قاعدة الأتمتة بنجاح" })
        }
        resetForm()
      } else {
        const payload = await response.json().catch(() => ({} as any))
        setAutomationNotice({ type: "error", text: payload?.error || (editing ? "تعذر تعديل قاعدة الأتمتة" : "تعذر إنشاء قاعدة الأتمتة") })
      }
    } catch (error) {
      console.error("Error saving rule:", error)
      setAutomationNotice({ type: "error", text: editing ? "تعذر الاتصال بالسيرفر أثناء تعديل القاعدة" : "تعذر الاتصال بالسيرفر أثناء إنشاء القاعدة" })
    } finally {
      setCreating(false)
    }
  }

  const handleEditRule = (rule: AutomationRule) => {
    setEditing(rule)
    setAutomationNotice(null)
    setFormData({
      name: rule.name,
      trigger: rule.trigger,
      action: rule.action,
      actionData: rule.action_data || "",
    })
  }

  const handleToggleRule = async (rule: AutomationRule) => {
    setAutomationNotice(null)
    try {
      const response = await fetch(`${BASE}/api/admin/automations/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: !rule.enabled }),
      })

      if (response.ok) {
        setRules((prev) =>
          prev.map((r) =>
            r.id === rule.id ? { ...r, enabled: !r.enabled } : r
          )
        )
        setAutomationNotice({ type: "success", text: rule.enabled ? "تم إيقاف القاعدة" : "تم تفعيل القاعدة" })
      } else {
        const payload = await response.json().catch(() => ({} as any))
        setAutomationNotice({ type: "error", text: payload?.error || "تعذر تحديث قاعدة الأتمتة" })
      }
    } catch (error) {
      console.error("Error toggling rule:", error)
      setAutomationNotice({ type: "error", text: "تعذر الاتصال بالسيرفر أثناء تحديث القاعدة" })
    }
  }

  const handleDeleteRule = async (rule: AutomationRule) => {
    const confirmDelete = window.confirm(`هل تريد حذف قاعدة "${rule.name}"؟`)
    if (!confirmDelete) return

    try {
      const response = await fetch(`${BASE}/api/admin/automations/${rule.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      const payload = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        setWaNotice({ type: "error", text: payload?.error || "تعذر حذف قاعدة الأتمتة" })
        return
      }

      setRules((prev) => prev.filter((r) => r.id !== rule.id))
      setWaNotice({ type: "success", text: "تم حذف قاعدة الأتمتة" })
    } catch (error) {
      console.error("Error deleting rule:", error)
      setWaNotice({ type: "error", text: "تعذر الاتصال بالسيرفر أثناء حذف القاعدة" })
    }
  }

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendingWa(true)
    setWaNotice(null)
    try {
      const response = await fetch(`${BASE}/api/admin/whatsapp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...waForm,
          mode: waWebState?.connected ? "web" : "auto",
        }),
      })

      const payload = await response.json().catch(() => ({} as any))

      if (response.ok) {
        setWaForm({ to: "", message: "" })
        const sendMode = payload?.mode === "web" || payload?.mode === "web_fallback" ? "WhatsApp Web" : "Meta"
        setWaNotice({ type: "success", text: `تم الإرسال بنجاح عبر ${sendMode}` })
      } else {
        setWaNotice({ type: "error", text: payload?.error || "فشل إرسال الرسالة" })
      }
    } catch (error) {
      console.error("Error sending WhatsApp:", error)
      setWaNotice({ type: "error", text: "تعذر الاتصال بالسيرفر أثناء الإرسال" })
    } finally {
      setSendingWa(false)
    }
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Create Rule Form */}
      <Card className="p-6 border-white/10 bg-white/5">
        <h3 className="font-bold text-lg mb-4">{editing ? "تعديل قاعدة الأتمتة" : "إنشاء قاعدة أتمتة جديدة"}</h3>

        {automationNotice && (
          <div className={cn(
            "mb-4 rounded-lg border px-4 py-3 text-sm",
            automationNotice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-200"
          )}>
            {automationNotice.text}
          </div>
        )}

        <form onSubmit={handleSubmitRule} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">اسم القاعدة</label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="مثال: إرسال شكراً بعد الشراء"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">المحفز</label>
              <select
                value={formData.trigger}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, trigger: e.target.value }))
                }
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value} className="bg-gray-900">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">الإجراء</label>
              <select
                value={formData.action}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, action: e.target.value }))
                }
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                {ACTIONS.map((a) => (
                  <option key={a.value} value={a.value} className="bg-gray-900">
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                تفاصيل الإجراء (اختياري)
              </label>
              <Input
                value={formData.actionData}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, actionData: e.target.value }))
                }
                placeholder="نص الرسالة أو رمز الكوبون..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={creating || !formData.name}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                {editing ? "حفظ التعديلات" : "إضافة قاعدة"}
              </>
            )}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="outline"
              className="mr-2 border-white/20"
              onClick={resetForm}
            >
              إلغاء التعديل
            </Button>
          )}
        </form>
      </Card>

      {/* Rules List */}
      <Card className="p-6 border-white/10 bg-white/5">
        <h3 className="font-bold text-lg mb-4">قواعد الأتمتة النشطة</h3>
        <div className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-white/50 text-center py-4">لا توجد قواعد أتمتة حالياً</p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "p-4 rounded-lg border transition-opacity",
                  rule.enabled
                    ? "border-primary/30 bg-primary/5"
                    : "border-white/10 bg-white/3 opacity-60"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{rule.name}</p>
                    <div className="flex gap-3 mt-2 text-xs text-white/50">
                      <span>
                        🎯{" "}
                        {TRIGGERS.find((t) => t.value === rule.trigger)?.label}
                      </span>
                      <span>→</span>
                      <span>
                        ⚡{" "}
                        {ACTIONS.find((a) => a.value === rule.action)?.label}
                      </span>
                    </div>
                    {rule.action_data && (
                      <p className="mt-2 text-xs text-white/60 line-clamp-2">{rule.action_data}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20"
                      onClick={() => handleEditRule(rule)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20"
                      onClick={() => handleToggleRule(rule)}
                    >
                      {rule.enabled ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteRule(rule)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* WhatsApp Manual Send */}
      <Card className="p-6 border-white/10 bg-white/5">
        <h3 className="font-bold text-lg mb-4">إرسال WhatsApp مباشر</h3>
        <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-white/80">
              ربط واتساب بدون Meta (QR)
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleDisconnectWhatsApp}
                disabled={waRefreshLoading}
                variant="outline"
                className="border-amber-300/40 text-amber-200 hover:bg-amber-500/10"
              >
                {waRefreshLoading ? "جاري الإلغاء..." : "إلغاء القديم"}
              </Button>
              <Button
                type="button"
                onClick={handleConnectWhatsAppWeb}
                disabled={waConnectLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {waConnectLoading ? "جاري التجهيز..." : "إنشاء QR للربط"}
              </Button>
            </div>
          </div>

          {waWebState && (
            <p className="text-xs text-white/70">
              الحالة: {waWebState.connected ? "متصل" : waWebState.state === "qr" ? "بانتظار مسح الكود" : "غير متصل"}
            </p>
          )}

          {waWebState?.qrImageDataUrl && !waWebState.connected && (
            <div className="bg-white rounded-md p-3 w-fit">
              <img
                src={waWebState.qrImageDataUrl}
                alt="WhatsApp QR"
                className="h-52 w-52"
              />
            </div>
          )}

          {waWebState?.lastError && (
            <p className="text-xs text-amber-300">{waWebState.lastError}</p>
          )}

          {waNotice && (
            <p className={cn("text-xs", waNotice.type === "success" ? "text-emerald-300" : "text-rose-300")}>{waNotice.text}</p>
          )}
        </div>

        <form onSubmit={handleSendWhatsApp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">رقم العميل (بصيغة دولية)</label>
            <Input
              value={waForm.to}
              onChange={(e) => setWaForm((prev) => ({ ...prev, to: e.target.value }))}
              placeholder="9665XXXXXXXX"
              className="bg-white/10 border-white/20"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">نص الرسالة</label>
            <Input
              value={waForm.message}
              onChange={(e) => setWaForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="عرض خاص اليوم..."
              className="bg-white/10 border-white/20"
              required
            />
          </div>
          <Button type="submit" disabled={sendingWa || !waForm.to || !waForm.message} className="bg-emerald-600 hover:bg-emerald-700">
            {sendingWa ? "جاري الإرسال..." : "إرسال واتساب"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
