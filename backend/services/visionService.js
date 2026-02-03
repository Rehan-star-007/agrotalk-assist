import fetch from "node-fetch";

const HF_URL =
    "https://api-inference.huggingface.co/models/google/vit-base-patch16-224";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function analyzeWithVision(imageBuffer) {
    if (!process.env.HF_TOKEN) {
        throw new Error("HF_TOKEN is missing in environment variables");
    }

    const headers = {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
    };

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            console.log(`HF attempt ${attempt}...`);

            const res = await fetch(HF_URL, {
                method: "POST",
                headers,
                body: imageBuffer,
            });

            const raw = await res.text();

            if (res.status === 503 || raw.toLowerCase().includes("loading")) {
                console.log("HF cold start/loading, waiting...");
                await sleep(12000);
                continue;
            }

            if (!res.ok) {
                throw new Error(`HF HTTP ${res.status}: ${raw}`);
            }

            const data = JSON.parse(raw);

            if (Array.isArray(data)) {
                console.log("HF success");
                return { source: "hf", labels: data };
            }

            throw new Error("Unexpected HF response: " + raw);
        } catch (e) {
            console.error("HF error:", e.message);
        }
    }

    // FALLBACK
    console.log("Using fallback vision logic");

    return {
        source: "fallback",
        labels: [
            { label: "leaf", score: 0.9 },
            { label: "plant disease", score: 0.7 },
        ],
    };
}
