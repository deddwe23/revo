"use client"

import * as React from "react"
import { Mail, Send, Calendar, Users, Loader2, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")

interface BulkEmail {
  id: number
  subject: string
  body: string
  recipient_group: string
  status: string
  scheduled_at: string | null
  sent_count: number
  created_at: string
}

interface CustomerOption {
  id: number
  email: string
  full_name: string
}

const RECIPIENT_GROUPS = [
  { value: "all_customers", label: "جميع العملاء" },
  { value: "recent_customers", label: "العملاء الجدد (آخر 30 يوم)" },
  { value: "inactive_customers", label: "العملاء النائمون (120+ يوم)" },
  { value: "vip_customers", label: "العملاء المميزين" },
]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "text-gray-400" },
  scheduled: { label: "مجدول", color: "text-blue-400" },
  sent: { label: "مرسل", color: "text-green-400" },
  failed: { label: "فشل", color: "text-red-400" },
}

export function BulkEmailManager() {
  const [emails, setEmails] = React.useState<BulkEmail[]>([])
  const [loading, setLoading] = React.useState(true)
  const [creating, setCreating] = React.useState(false)
  const [customers, setCustomers] = React.useState<CustomerOption[]>([])

  const [formData, setFormData] = React.useState({
    subject: "",
    body: "",
    recipientGroup: "all_customers",
    specificCustomerEmail: "",
    scheduledAt: "",
  })

  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [selectedEmail, setSelectedEmail] = React.useState<BulkEmail | null>(null)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [emailsResponse, customersResponse] = await Promise.all([
        fetch(`${BASE}/api/admin/emails`, { credentials: "include" }),
        fetch(`${BASE}/api/admin/customers`, { credentials: "include" }),
      ])

      if (emailsResponse.ok) {
        const emailsData = (await emailsResponse.json()) as { emails: BulkEmail[] }
        setEmails(emailsData.emails || [])
      }

      if (customersResponse.ok) {
        const customersData = (await customersResponse.json()) as { customers: CustomerOption[] }
        setCustomers(customersData.customers || [])
      }
    } catch (error) {
      console.error("Error fetching bulk email data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const targetGroup = formData.recipientGroup === "specific_customer" && formData.specificCustomerEmail
        ? `email:${formData.specificCustomerEmail.toLowerCase()}`
        : formData.recipientGroup

      const response = await fetch(`${BASE}/api/admin/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject: formData.subject,
          body: formData.body,
          recipientGroup: targetGroup,
          scheduledAt: formData.scheduledAt || null,
        }),
      })

      if (response.ok) {
        const data = await response.json() as { email: BulkEmail }
        setEmails((prev) => [data.email, ...prev])
        setFormData({
          subject: "",
          body: "",
          recipientGroup: "all_customers",
          specificCustomerEmail: "",
          scheduledAt: "",
        })
      }
    } catch (error) {
      console.error("Error creating email:", error)
    } finally {
      setCreating(false)
    }
  }

  const handleSendEmail = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/emails/${id}/send`, {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        setEmails((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status: "sent" } : e))
        )
      }
    } catch (error) {
      console.error("Error sending email:", error)
    }
  }

  const recipientLabel = (value: string) => {
    if (value.startsWith("email:")) {
      return `عميل محدد (${value.slice(6)})`
    }
    return RECIPIENT_GROUPS.find((g) => g.value === value)?.label || value
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Email Form */}
      <Card className="p-6 border-white/10 bg-white/5">
        <h3 className="font-bold text-lg mb-4">إرسال رسالة بريدية إلى العملاء</h3>

        <form onSubmit={handleCreateEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">الفئة المستهدفة</label>
            <select
              value={formData.recipientGroup}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, recipientGroup: e.target.value }))
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            >
              {RECIPIENT_GROUPS.map((group) => (
                <option key={group.value} value={group.value} className="bg-gray-900">
                  {group.label}
                </option>
              ))}
              <option value="specific_customer" className="bg-gray-900">عميل محدد (بريد واحد)</option>
            </select>
          </div>

          {formData.recipientGroup === "specific_customer" && (
            <div>
              <label className="block text-sm font-medium mb-2">اختر العميل</label>
              <select
                value={formData.specificCustomerEmail}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, specificCustomerEmail: e.target.value }))
                }
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                required
              >
                <option value="" className="bg-gray-900">اختر البريد</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.email} className="bg-gray-900">
                    {customer.full_name} - {customer.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">الموضوع</label>
            <Input
              value={formData.subject}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subject: e.target.value }))
              }
              placeholder="موضوع الرسالة"
              className="bg-white/10 border-white/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">محتوى الرسالة</label>
            <Textarea
              value={formData.body}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, body: e.target.value }))
              }
              placeholder="اكتب رسالتك هنا..."
              className="bg-white/10 border-white/20 min-h-[120px] resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">جدول الإرسال (اختياري)</label>
            <Input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, scheduledAt: e.target.value }))
              }
              className="bg-white/10 border-white/20"
            />
            <p className="text-xs text-white/50 mt-1">اتركها فارغة للإرسال الفوري</p>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={creating || !formData.subject || !formData.body}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  حفظ الرسالة
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/20"
              onClick={() => setPreviewOpen(!previewOpen)}
            >
              معاينة
            </Button>
          </div>

          {previewOpen && (
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="text-sm text-white/60 mb-2">معاينة الرسالة:</p>
              <div className="bg-white/3 rounded p-3 space-y-2">
                <p>
                  <span className="text-white/50">الموضوع: </span>
                  <span className="font-medium">{formData.subject || "---"}</span>
                </p>
                <p className="text-white/70 whitespace-pre-wrap">{formData.body}</p>
              </div>
            </div>
          )}
        </form>
      </Card>

      {/* Email List */}
      <Card className="p-6 border-white/10 bg-white/5">
        <h3 className="font-bold text-lg mb-4">الرسائل السابقة</h3>
        <div className="space-y-3">
          {emails.length === 0 ? (
            <p className="text-white/50 text-center py-4">لا توجد رسائل بعد</p>
          ) : (
            emails.map((email) => (
              <div
                key={email.id}
                className="p-4 rounded-lg border border-white/10 bg-white/3 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <p className="font-medium">{email.subject}</p>
                  <div className="flex gap-3 mt-1 text-xs text-white/50">
                    <span>
                      {recipientLabel(email.recipient_group)}
                    </span>
                    <span>
                      {new Date(email.created_at).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={cn("text-sm font-medium", STATUS_CONFIG[email.status].color)}>
                      {STATUS_CONFIG[email.status].label}
                    </p>
                    {email.sent_count > 0 && (
                      <p className="text-xs text-white/50">
                        تم الإرسال: {email.sent_count} رسالة
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {email.status === "draft" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 gap-1"
                      onClick={() => handleSendEmail(email.id)}
                    >
                      <Send className="h-4 w-4" />
                      إرسال
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Preview Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl border-white/20 bg-gray-900 p-6">
            <h3 className="font-bold text-lg mb-4">{selectedEmail.subject}</h3>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-white/60">
                المستلمون:{" "}
                {
                  recipientLabel(selectedEmail.recipient_group)
                }
              </p>
              <div className="p-4 bg-white/5 rounded border border-white/10">
                <p className="whitespace-pre-wrap text-white/70">
                  {selectedEmail.body}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-white/20 w-full"
              onClick={() => setSelectedEmail(null)}
            >
              إغلاق
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}
