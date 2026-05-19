"use client"

import * as React from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, Users, ShoppingCart, DollarSign, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AnalyticsData {
  totalRevenue?: number
  avgOrderValue?: number
  orderStats?: Array<{ status: string; count: string; total_revenue?: string }>
  revenueChart?: Array<{ date: string; order_count: number; daily_revenue: number }>
  topProducts?: Array<{ title: string; order_count?: number; sales_count?: number; total_revenue: number }>
  conversionMetrics?: { returning_customers?: string; guest_orders?: string; total_orders?: string }
  customerTrend?: Array<{ date: string; new_customers: number }>
  orders?: { total?: number; completed?: number; pending?: number; rejected?: number; avgValue?: number }
  customers?: { total?: number; newLast30Days?: number }
  dailyRevenue?: Array<{ date: string; order_count: number; daily_revenue: number }>
}

const STATUS_COLORS: Record<string, string> = {
  pending_review: "#f59e0b",
  in_progress: "#3b82f6",
  completed: "#22c55e",
  rejected: "#ef4444",
  cancelled: "#ef4444",
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = React.useState<AnalyticsData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [exporting, setExporting] = React.useState(false)

  const fetchAnalytics = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${BASE}/api/admin/analytics`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json() as AnalyticsData
        setAnalytics(data)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleExport = async (format: "csv" | "json") => {
    setExporting(true)
    try {
      const response = await fetch(`${BASE}/api/admin/export/${format}`, {
        credentials: "include",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = format === "csv" ? "طلبات.csv" : "طلبات.json"
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Error exporting:", error)
    } finally {
      setExporting(false)
    }
  }

  React.useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!analytics) {
    return <div className="text-center py-8 text-white/50">خطأ في تحميل الإحصائيات</div>
  }

  const normalizedOrderStats = analytics.orderStats ?? [
    { status: "pending_review", count: String(analytics.orders?.pending ?? 0), total_revenue: "0" },
    { status: "completed", count: String(analytics.orders?.completed ?? 0), total_revenue: String(analytics.totalRevenue ?? 0) },
    { status: "rejected", count: String(analytics.orders?.rejected ?? 0), total_revenue: "0" },
  ]

  const revenueSeries = analytics.revenueChart ?? analytics.dailyRevenue ?? []
  const topProducts = analytics.topProducts ?? []
  const customerTrend = analytics.customerTrend ?? []
  const totalOrders = analytics.conversionMetrics?.total_orders ?? String(analytics.orders?.total ?? 0)
  const returningCustomers = analytics.conversionMetrics?.returning_customers ?? String(analytics.customers?.newLast30Days ?? 0)
  const avgOrderValue = analytics.avgOrderValue ?? analytics.orders?.avgValue ?? 0

  const statusData = normalizedOrderStats.map((s) => ({
    name: { pending_review: "مراجعة", in_progress: "تجهيز", completed: "مكتمل", cancelled: "ملغي", rejected: "مرفوض" }[s.status] || s.status,
    value: Number(s.count),
    revenue: Number(s.total_revenue) || 0,
    fill: STATUS_COLORS[s.status] || "#6b7280",
  }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {Number(analytics.totalRevenue ?? 0).toLocaleString("ar-SA")} ر.س
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-green-400/30" />
          </div>
        </Card>

        <Card className="p-4 border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">متوسط قيمة الطلب</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {Number(avgOrderValue).toLocaleString("ar-SA")} ر.س
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-blue-400/30" />
          </div>
        </Card>

        <Card className="p-4 border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">إجمالي الطلبات</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">
                {totalOrders}
              </p>
            </div>
            <ShoppingCart className="h-10 w-10 text-purple-400/30" />
          </div>
        </Card>

        <Card className="p-4 border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">العملاء العائدون</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">
                {returningCustomers}
              </p>
            </div>
            <Users className="h-10 w-10 text-cyan-400/30" />
          </div>
        </Card>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => handleExport("csv")}
          disabled={exporting}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          {exporting ? "جاري التصدير..." : "تصدير CSV"}
        </Button>
        <Button
          onClick={() => handleExport("json")}
          disabled={exporting}
          variant="outline"
          className="gap-2 border-white/20"
        >
          <Download className="h-4 w-4" />
          تصدير JSON
        </Button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="p-6 border-white/10 bg-white/5">
          <h3 className="font-bold mb-4">إيراداتك اليومية</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueSeries.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)" }} />
              <Legend />
              <Line type="monotone" dataKey="daily_revenue" stroke="#22c55e" name="الإيراد" dot={false} />
              <Line type="monotone" dataKey="order_count" stroke="#3b82f6" name="عدد الطلبات" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Orders by Status */}
        <Card className="p-6 border-white/10 bg-white/5">
          <h3 className="font-bold mb-4">الطلبات حسب الحالة</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="p-6 border-white/10 bg-white/5">
        <h3 className="font-bold mb-4">أفضل المنتجات</h3>
        <div className="space-y-3">
          {topProducts.map((product, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/3">
              <div className="flex-1">
                <p className="font-medium">{product.title}</p>
                <p className="text-sm text-white/50">{product.order_count ?? product.sales_count ?? 0} طلبات</p>
              </div>
              <p className="text-lg font-bold text-green-400">
                {Number(product.total_revenue).toLocaleString("ar-SA")} ر.س
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Customer Growth */}
      <Card className="p-6 border-white/10 bg-white/5">
        <h3 className="font-bold mb-4">نمو العملاء الجدد</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={customerTrend.slice(-14)}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)" }} />
            <Bar dataKey="new_customers" fill="#7c3aed" name="عملاء جدد" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
