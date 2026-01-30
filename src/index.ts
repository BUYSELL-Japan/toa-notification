import { createHmac } from 'node:crypto';

export interface Env {
    SLACK_WEBHOOK_URL: string;
    SHOPEE_PARTNER_KEY: string;
    SHOPEE_SHOP_ID: string;
    DB: D1Database;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // CORS Headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        };

        // Handle OPTIONS for CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // Health check endpoint
        if (request.method === "GET" && url.pathname === "/") {
            return new Response("Shopee Notification Service Running", {
                status: 200,
                headers: corsHeaders
            });
        }

        // API: Get Notifications
        if (request.method === "GET" && url.pathname === "/api/notifications") {
            try {
                const { results } = await env.DB.prepare(
                    "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50"
                ).all();
                return new Response(JSON.stringify(results), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: "Database Error" }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
        }

        if (request.method === "POST") {
            // 1. Get raw body and signature
            const signature = request.headers.get("Authorization");
            if (!signature) {
                return new Response("Missing Signature", { status: 401, headers: corsHeaders });
            }

            const rawBody = await request.text();

            // 2. Verify signature (HMAC-SHA256)
            const isValid = await verifySignature(request.url, rawBody, signature, env.SHOPEE_PARTNER_KEY);

            // 3. Parse and Process
            try {
                const payload = JSON.parse(rawBody);
                const decodedText = decodedPayload(payload);

                // Save to Database
                try {
                    await env.DB.prepare(
                        "INSERT INTO notifications (project, content, raw_payload) VALUES (?, ?, ?)"
                    ).bind("Shopee", decodedText, rawBody).run();
                } catch (dbError) {
                    console.error("DB Insert Failed:", dbError);
                }

                // Send to Slack
                await sendToSlack(decodedText, env.SLACK_WEBHOOK_URL, isValid);

                return new Response("OK", { status: 200, headers: corsHeaders });
            } catch (e) {
                return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
            }
        }

        return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    },
};

async function verifySignature(url: string, body: string, signature: string, key: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const data = encoder.encode(url + "|" + body);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signed = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const hash = Array.from(new Uint8Array(signed))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    return hash === signature;
}

function decodedPayload(payload: any): string {
    if (payload && payload.data && payload.data.content) {
        return `New Message: ${payload.data.content}\nFrom: ${payload.data.from_id}`;
    }
    return `Received Event: \`\`\`${JSON.stringify(payload, null, 2)}\`\`\``;
}

async function sendToSlack(text: string, webhookUrl: string, validSignature: boolean) {
    const warning = validSignature ? "" : "⚠️ *WARNING: Invalid Signature* (Check Shopee URL settings)\n";
    const body = {
        text: `${warning}${text}`
    };

    await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}


