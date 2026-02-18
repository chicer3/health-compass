import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch user's recent test data for context
    let healthContext = "";
    if (userId) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const resultsResp = await fetch(
        `${SUPABASE_URL}/rest/v1/test_results?user_id=eq.${userId}&order=record_date.desc&limit=50`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      const testResults = await resultsResp.json();

      const logsResp = await fetch(
        `${SUPABASE_URL}/rest/v1/activity_logs?user_id=eq.${userId}&order=log_date.desc&limit=30`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      const activityLogs = await logsResp.json();

      if (testResults.length > 0) {
        healthContext += "\n\nUser's recent test results:\n" + JSON.stringify(testResults.slice(0, 30), null, 2);
      }
      if (activityLogs.length > 0) {
        healthContext += "\n\nUser's recent activity logs:\n" + JSON.stringify(activityLogs.slice(0, 15), null, 2);
      }
    }

    const systemPrompt = `You are MedPulse Health Assistant, a knowledgeable and empathetic AI health companion. You help users understand their medical test results, identify trends, and provide general health information.

IMPORTANT GUIDELINES:
- You are NOT a doctor. Always recommend consulting healthcare professionals for medical decisions.
- Explain test results in plain language that patients can understand.
- When discussing trends, correlate with the user's activity logs (medications, meals, exercise) when available.
- Be encouraging but honest about abnormal values.
- Format responses with markdown for readability.
- Keep responses concise but thorough.
${healthContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
