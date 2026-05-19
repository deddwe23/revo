import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import PublicHeader from "@/components/store/PublicHeader";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-background" dir="rtl">
      <PublicHeader />
      <div className="flex items-center justify-center px-4 py-16">
        <Card className="glass-panel w-full max-w-md border border-white/10 bg-white/5 text-white shadow-none">
          <CardContent className="pt-6">
            <div className="mb-4 flex gap-2">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <h1 className="text-2xl font-bold text-white">الصفحة غير موجودة</h1>
            </div>

            <p className="mt-4 text-sm text-white/60">
              الرابط الذي طلبته غير متوفر حالياً أو تم نقله.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
