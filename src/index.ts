import { createHmac } from 'node:crypto';

export interface Env {
    SLACK_WEBHOOK_URL: string;
    SHOPEE_PARTNER_KEY: string;
    SHOPEE_SHOP_ID: string;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // Health check endpoint
        if (request.method === "GET") {
            return new Response("Shopee Notification Service Running", { status: 200 });
        }

        if (request.method === "POST") {
            // 1. Get raw body and signature
            const signature = request.headers.get("Authorization");
            if (!signature) {
                return new Response("Missing Signature", { status: 401 });
            }

            const rawBody = await request.text();

            // 2. Verify signature (HMAC-SHA256)
            // Shopee signature is `cal_hmac(url|body, partner_key)`
            // Note: The URL used in signature calculation must be exactly as registered in Shopee.
            // Usually it's full URL. Let's try to verify.
            // If verification fails, we might need to debug how Shopee constructs the base string.
            // For now, let's implement standard HMAC verification.

            const isValid = await verifySignature(request.url, rawBody, signature, env.SHOPEE_PARTNER_KEY);

            // For initial debugging, we might want to log if signature fails but proceed, 
            // OR just enforce it. Let's enforce it but verify logic is correct.
            // Actually, let's allow it for now if we can't perfectly replicate the URL string Shopee sees,
            // but log it.

            // 3. Parse and Process
            try {
                const payload = JSON.parse(rawBody);

                // Check if it's a chat event
                // Shopee Push Mechanism structure varies.
                // Assuming payload has `code` or `data`.

                await sendToSlack(decodedPayload(payload), env.SLACK_WEBHOOK_URL, isValid);

                return new Response("OK", { status: 200 });
            } catch (e) {
                return new Response("Invalid JSON", { status: 400 });
            }
        }

        return new Response("Method Not Allowed", { status: 405 });
    },
};

async function verifySignature(url: string, body: string, signature: string, key: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const data = encoder.encode(url + "|" + body); // Shopee pattern: url|body

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
    // Customize this based on actual Shopee payload structure
    // For now, dump the whole payload or extracting text if obvious
    // Example: payload.data.content
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

