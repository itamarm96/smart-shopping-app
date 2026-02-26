import { NextRequest, NextResponse } from "next/server";
import { groq, MODEL } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text || typeof text !== "string") {
            return NextResponse.json({ error: "Missing text" }, { status: 400 });
        }

        console.log("API Key exists:", !!process.env.GROQ_API_KEY);

        const systemPrompt = `You are a supermarket items categorizer. You receive a raw shopping list in Hebrew and must categorize every item into standard Israeli supermarket departments.

The departments are:
- פירות וירקות (icon: 🥬, color: #22c55e)
- בשר ודגים (icon: 🥩, color: #e07850)
- חלב וקירור (icon: 🧀, color: #3b82f6)
- קפואים (icon: 🧊, color: #06b6d4)
- יבש/מזווה (icon: 🫙, color: #f59e0b)
- לחם ומאפים (icon: 🍞, color: #d97706)
- פארם וניקיון (icon: 🧴, color: #8b5cf6)
- שתייה (icon: 🥤, color: #ec4899)
- אחר (icon: 🛒, color: #6b7280)

You MUST return your response ONLY as a valid JSON object with this structure:
{
  "categories": [
    {
      "name": "department name in Hebrew",
      "icon": "emoji icon",
      "color": "hex color",
      "items": [
        { "name": "item name in Hebrew" }
      ]
    }
  ]
}

Rules:
- Only include categories that have items
- Each item should appear exactly once
- Clean up item names but keep them in Hebrew
- If an item doesn't fit any specific category, put it in "אחר"
- Do NOT include any text outside the JSON object`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Here is the shopping list:\n${text}` },
            ],
            model: MODEL,
            temperature: 0.3,
            response_format: { type: "json_object" },
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(responseText);

        // Add IDs and checked status to items
        let idCounter = 0;
        const categories = parsed.categories.map(
            (cat: { name: string; icon: string; color: string; items: { name: string }[] }) => ({
                ...cat,
                items: cat.items.map((item: { name: string }) => ({
                    id: `item-${idCounter++}`,
                    name: item.name,
                    category: cat.name,
                    checked: false,
                })),
            })
        );

        return NextResponse.json({ categories });
    } catch (error) {
        console.error("Categorize error:");
        console.dir(error, { depth: null });
        return NextResponse.json(
            { error: "Failed to categorize items" },
            { status: 500 }
        );
    }
}
