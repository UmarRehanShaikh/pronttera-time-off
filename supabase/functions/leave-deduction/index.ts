import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeaveDeductionRequest {
  user_id: string;
  days: number;
  leave_type: "general" | "optional";
}

interface LeaveDeductionResult {
  success: boolean;
  message: string;
  deducted_from?: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    carried: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, days, leave_type }: LeaveDeductionRequest = await req.json();
    const currentYear = new Date().getFullYear();

    // Get current ledger
    const { data: ledger, error: ledgerError } = await supabase
      .from("leave_ledger")
      .select("*")
      .eq("user_id", user_id)
      .eq("year", currentYear)
      .single();

    if (ledgerError || !ledger) {
      throw new Error("Leave ledger not found for user");
    }

    // Handle optional leave
    if (leave_type === "optional") {
      if (ledger.optional_used + 1 > 4) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Maximum optional holidays (4) already used this year",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabase
        .from("leave_ledger")
        .update({ optional_used: ledger.optional_used + 1 })
        .eq("id", ledger.id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Optional holiday recorded",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle general leave - deduct in order Q1 -> Q2 -> Q3 -> Q4 -> Carried
    let remaining = days;
    const deductions = { q1: 0, q2: 0, q3: 0, q4: 0, carried: 0 };
    const newBalances = {
      q1: ledger.q1,
      q2: ledger.q2,
      q3: ledger.q3,
      q4: ledger.q4,
      carried_from_last_year: ledger.carried_from_last_year,
    };

    // Deduct from Q1
    if (remaining > 0 && newBalances.q1 > 0) {
      const deduct = Math.min(remaining, newBalances.q1);
      deductions.q1 = deduct;
      newBalances.q1 -= deduct;
      remaining -= deduct;
    }

    // Deduct from Q2
    if (remaining > 0 && newBalances.q2 > 0) {
      const deduct = Math.min(remaining, newBalances.q2);
      deductions.q2 = deduct;
      newBalances.q2 -= deduct;
      remaining -= deduct;
    }

    // Deduct from Q3
    if (remaining > 0 && newBalances.q3 > 0) {
      const deduct = Math.min(remaining, newBalances.q3);
      deductions.q3 = deduct;
      newBalances.q3 -= deduct;
      remaining -= deduct;
    }

    // Deduct from Q4
    if (remaining > 0 && newBalances.q4 > 0) {
      const deduct = Math.min(remaining, newBalances.q4);
      deductions.q4 = deduct;
      newBalances.q4 -= deduct;
      remaining -= deduct;
    }

    // Deduct from carried
    if (remaining > 0 && newBalances.carried_from_last_year > 0) {
      const deduct = Math.min(remaining, newBalances.carried_from_last_year);
      deductions.carried = deduct;
      newBalances.carried_from_last_year -= deduct;
      remaining -= deduct;
    }

    if (remaining > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Insufficient leave balance. Short by ${remaining} days.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update ledger
    const { error: updateError } = await supabase
      .from("leave_ledger")
      .update(newBalances)
      .eq("id", ledger.id);

    if (updateError) throw updateError;

    const result: LeaveDeductionResult = {
      success: true,
      message: `Successfully deducted ${days} days`,
      deducted_from: deductions,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in leave-deduction:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
