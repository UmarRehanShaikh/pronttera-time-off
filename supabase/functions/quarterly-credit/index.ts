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

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 1-12

    // Determine which quarter to credit based on current month
    // Q1: Jan (1), Q2: Apr (4), Q3: Jul (7), Q4: Oct (10)
    let quarterColumn: string | null = null;
    if (currentMonth === 1) quarterColumn = "q1";
    else if (currentMonth === 4) quarterColumn = "q2";
    else if (currentMonth === 7) quarterColumn = "q3";
    else if (currentMonth === 10) quarterColumn = "q4";

    if (!quarterColumn) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Not a quarter start month",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("is_active", true);

    if (profilesError) throw profilesError;

    let credited = 0;
    let errors = 0;

    for (const profile of profiles || []) {
      // Check if ledger exists for current year
      const { data: existingLedger } = await supabase
        .from("leave_ledger")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("year", currentYear)
        .maybeSingle();

      if (!existingLedger) {
        // Create new ledger for the year
        const newLedger: Record<string, number | string> = {
          user_id: profile.user_id,
          year: currentYear,
          q1: 0,
          q2: 0,
          q3: 0,
          q4: 0,
          carried_from_last_year: 0,
          optional_used: 0,
        };
        newLedger[quarterColumn] = 5;

        const { error: insertError } = await supabase
          .from("leave_ledger")
          .insert(newLedger);

        if (insertError) {
          console.error(`Error creating ledger for ${profile.user_id}:`, insertError);
          errors++;
        } else {
          credited++;
        }
      } else {
        // Update existing ledger - add 5 to the quarter
        const { error: updateError } = await supabase.rpc("increment_quarter_balance", {
          ledger_id: existingLedger.id,
          quarter: quarterColumn,
          amount: 5,
        });

        // Fallback if RPC doesn't exist - direct update
        if (updateError) {
          const updateData: Record<string, number> = {};
          updateData[quarterColumn] = 5;
          
          const { error: directUpdateError } = await supabase
            .from("leave_ledger")
            .update(updateData)
            .eq("id", existingLedger.id);

          if (directUpdateError) {
            console.error(`Error updating ledger for ${profile.user_id}:`, directUpdateError);
            errors++;
          } else {
            credited++;
          }
        } else {
          credited++;
        }
      }
    }

    console.log(`Quarterly credit completed: ${credited} users credited, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Quarterly credit completed for ${quarterColumn.toUpperCase()}`,
        credited,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in quarterly-credit:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
