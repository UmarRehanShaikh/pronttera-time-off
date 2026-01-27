import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalRequest {
  request_id: string;
  action: "approve" | "reject";
  rejection_reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const managerId = claimsData.claims.sub as string;

    const { request_id, action, rejection_reason }: ApprovalRequest = await req.json();

    // Get the leave request
    const { data: leaveRequest, error: requestError } = await supabaseAdmin
      .from("leave_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (requestError || !leaveRequest) {
      return new Response(
        JSON.stringify({ success: false, message: "Leave request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (leaveRequest.status !== "pending") {
      return new Response(
        JSON.stringify({ success: false, message: "Request is not pending" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify manager has permission (is manager of the employee or admin)
    const { data: managerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", managerId)
      .maybeSingle();

    const { data: employeeProfile } = await supabaseAdmin
      .from("profiles")
      .select("manager_id")
      .eq("user_id", leaveRequest.user_id)
      .maybeSingle();

    const isAdmin = managerRole?.role === "admin";
    const isManager = employeeProfile?.manager_id === managerId;

    if (!isAdmin && !isManager) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authorized to approve this request" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "approve") {
      // Deduct leave balance
      const deductionResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/leave-deduction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            user_id: leaveRequest.user_id,
            days: leaveRequest.days,
            leave_type: leaveRequest.leave_type,
          }),
        }
      );

      const deductionResult = await deductionResponse.json();

      if (!deductionResult.success) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Cannot approve: ${deductionResult.message}`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update request status
      const { error: updateError } = await supabaseAdmin
        .from("leave_requests")
        .update({
          status: "approved",
          approved_by: managerId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", request_id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Leave request approved",
          deduction: deductionResult.deducted_from,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reject") {
      const { error: updateError } = await supabaseAdmin
        .from("leave_requests")
        .update({
          status: "rejected",
          approved_by: managerId,
          approved_at: new Date().toISOString(),
          rejection_reason: rejection_reason || null,
        })
        .eq("id", request_id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Leave request rejected",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in leave-approval:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
