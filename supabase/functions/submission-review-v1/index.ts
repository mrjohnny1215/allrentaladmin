import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const allowedOrigin = "https://allrentaladmin.vercel.app"
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
}
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.headers.get("origin") && req.headers.get("origin") !== allowedOrigin) return response({ error: "허용되지 않은 요청입니다." }, 403)

  try {
    const { action, id, password, submission, employeeId, submissionId, reviewStatus } = await req.json()
    if (!id) throw new Error("로그인 정보를 확인할 수 없습니다.")
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")
    const { data: user, error: userError } = await db.from("users").select("id,pw,status,role,parent_id").eq("id", id).maybeSingle()
    if (userError || !user || user.status !== "APPROVED" || user.pw !== password) return response({ error: "로그인 정보를 다시 확인해 주세요." }, 401)

    if (action === "submit") {
      if (!submission || !submission.customerName || !Array.isArray(submission.items) || !submission.items.length) throw new Error("접수 정보가 완전하지 않습니다.")
      const { data, error } = await db.from("submission_reviews").insert({
        submission, submitted_by: user.id, assigned_manager_id: user.parent_id || "김성훈", review_status: "PENDING",
      }).select("id,submitted_at").single()
      if (error) throw error
      return response({ review: data })
    }

    if (action === "list") {
      let query = db.from("submission_reviews").select("id,submission,submitted_by,assigned_manager_id,review_status,submitted_at").order("submitted_at", { ascending: false })
      if (user.role !== "ADMIN") query = query.eq("submitted_by", user.id)
      const { data, error } = await query
      if (error) throw error
      return response({ submissions: (data ?? []).map((row) => ({ ...row.submission, id: row.id, createdAt: row.submitted_at, reviewStatus: row.review_status, submittedBy: row.submitted_by })) })
    }

    if (action === "review") {
      if (!submissionId || !["APPROVED", "REJECTED"].includes(reviewStatus)) return response({ error: "검수 상태를 확인해 주세요." }, 400)
      if (!["ADMIN", "MANAGER"].includes(user.role)) return response({ error: "관리자 또는 팀장만 검수할 수 있습니다." }, 403)

      let query = db.from("submission_reviews").update({ review_status: reviewStatus }).eq("id", submissionId)
      if (user.role !== "ADMIN") query = query.eq("assigned_manager_id", user.id)
      const { data, error } = await query.select("id,review_status").maybeSingle()
      if (error) throw error
      if (!data) return response({ error: "검수 권한이 없거나 접수를 찾을 수 없습니다." }, 404)
      return response({ review: { id: data.id, reviewStatus: data.review_status } })
    }

    if (action === "employee-summary") {
      if (user.role !== "ADMIN" || !employeeId) return response({ error: "관리자만 조회할 수 있습니다." }, 403)
      const { data: employee, error: employeeError } = await db.from("users").select("id,name,parent_id,fee_grade").eq("id", employeeId).maybeSingle()
      if (employeeError || !employee) return response({ error: "직원을 찾을 수 없습니다." }, 404)
      if (user.id !== "admin" && employee.parent_id !== user.id) return response({ error: "소속 직원만 조회할 수 있습니다." }, 403)
      const { data: rows, error } = await db.from("submission_reviews")
        .select("id,submission,review_status,submitted_at").eq("submitted_by", employee.id).order("submitted_at", { ascending: false })
      if (error) throw error
      const rate = Number(String(employee.fee_grade || "100%").replace("%", "")) / 100
      const submissions = (rows ?? []).map((row) => ({ ...row.submission, id: row.id, createdAt: row.submitted_at, reviewStatus: row.review_status }))
      const baseCommission = submissions.reduce((sum, item) => sum + (item.items || []).reduce((itemSum, product) => itemSum + Number(product.selectedOption?.commission || product.commission || 0), 0), 0)
      const { data: account } = await db.from("member_financial_profiles").select("bank_name,account_number,account_holder,updated_at").eq("user_id", employee.id).maybeSingle()
      return response({ employee, submissions, settlement: { count: submissions.length, baseCommission, expectedPayout: Math.floor(baseCommission * rate), rate }, account: account || null })
    }

    throw new Error("지원하지 않는 요청입니다.")
  } catch (error) {
    return response({ error: error.message || "처리 중 오류가 발생했습니다." }, 400)
  }
})
