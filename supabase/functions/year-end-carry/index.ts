import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action } = await req.json();
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    if (action === "calculate_carry") {
      // Run on Dec 31 - Calculate 50% carry forward
      const previousYear = currentYear;

      const { data: ledgers, error: ledgersError } = await supabase
        .from("leave_ledger")
        .select("*")
        .eq("year", previousYear);

      if (ledgersError) throw ledgersError;

      let processed = 0;
      for (const ledger of ledgers || []) {
        const totalRemaining = ledger.q1 + ledger.q2 + ledger.q3 + ledger.q4;
        const carryForward = Math.floor(totalRemaining * 0.5);

        // Store the carry forward value (will be applied on Jan 1)
        const { error: updateError } = await supabase
          .from("leave_ledger")
          .update({
            carried_from_last_year: carryForward,
            q1: 0,
            q2: 0,
            q3: 0,
            q4: 0,
          })
          .eq("id", ledger.id);

        if (!updateError) processed++;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Year-end carry calculated for ${processed} users`,
          processed,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "apply_new_year") {
      // Run on Jan 1 - Create new year ledgers with carried + Q1
      const newYear = currentYear;
      const previousYear = currentYear - 1;

      // Get previous year ledgers
      const { data: prevLedgers, error: prevError } = await supabase
        .from("leave_ledger")
        .select("*")
        .eq("year", previousYear);

      if (prevError) throw prevError;

      let created = 0;
      for (const prevLedger of prevLedgers || []) {
        const carriedBalance = prevLedger.carried_from_last_year || 0;

        // Create new year ledger with carried + Q1 credit
        const { error: insertError } = await supabase.from("leave_ledger").insert({
          user_id: prevLedger.user_id,
          year: newYear,
          q1: 5, // New Q1 credit
          q2: 0,
          q3: 0,
          q4: 0,
          carried_from_last_year: carriedBalance,
          optional_used: 0,
        });

        if (!insertError) created++;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `New year ledgers created for ${created} users`,
          created,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: "Invalid action. Use 'calculate_carry' or 'apply_new_year'",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in year-end-carry:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
