import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, userId, recordDate, filePath } = await req.json();
    
    if (!imageBase64 || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Use Gemini vision to extract test results
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a medical record OCR assistant. Extract all test results from the medical record image. For each test, identify the test name, category, numeric value, unit, normal range (min and max), and whether it's normal.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all medical test results from this image. Return the results as a JSON array."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_test_results",
              description: "Extract medical test results from the image",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        test_name: { type: "string", description: "Name of the test" },
                        test_category: { type: "string", description: "Category like 'blood work', 'vitals', 'hormones', 'metabolic', 'liver', 'kidney', 'lipid panel', 'thyroid', 'vitamins'" },
                        value: { type: "number", description: "Numeric test value" },
                        value_text: { type: "string", description: "Original value text if non-numeric" },
                        unit: { type: "string", description: "Unit of measurement" },
                        normal_range_min: { type: "number", description: "Lower bound of normal range" },
                        normal_range_max: { type: "number", description: "Upper bound of normal range" },
                        is_normal: { type: "boolean", description: "Whether the value is within normal range" }
                      },
                      required: ["test_name", "test_category"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["results"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_test_results" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required. Please add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Failed to process image" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let extractedResults: any[] = [];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      extractedResults = parsed.results || [];
    }

    // Save to Supabase
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create health record
    const recordResp = await fetch(`${SUPABASE_URL}/rest/v1/health_records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: userId,
        record_date: recordDate,
        source_image_url: filePath,
      }),
    });

    const [healthRecord] = await recordResp.json();

    // Insert test results
    if (extractedResults.length > 0 && healthRecord?.id) {
      const testRows = extractedResults.map((r: any) => ({
        health_record_id: healthRecord.id,
        user_id: userId,
        test_name: r.test_name,
        test_category: r.test_category || "general",
        value: r.value ?? null,
        value_text: r.value_text ?? null,
        unit: r.unit ?? null,
        normal_range_min: r.normal_range_min ?? null,
        normal_range_max: r.normal_range_max ?? null,
        is_normal: r.is_normal ?? null,
        record_date: recordDate,
      }));

      await fetch(`${SUPABASE_URL}/rest/v1/test_results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(testRows),
      });
    }

    return new Response(JSON.stringify({ results: extractedResults, recordId: healthRecord?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
