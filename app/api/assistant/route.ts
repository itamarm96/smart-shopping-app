import { NextRequest, NextResponse } from "next/server";
import { groq, MODEL } from "@/lib/gemini";
import { ShoppingItem } from "@/lib/types";

export async function POST(req: NextRequest) {
    try {
        const { message, items } = await req.json();

        if (!message || typeof message !== "string") {
            return NextResponse.json({ error: "Missing message" }, { status: 400 });
        }

        const systemPrompt = `You are a smart supermarket assistant helping a user with their shopping list. You will receive the user's current shopping list (pending and completed items) and a message from the user.

Your goals:
1. Identify which items the user has found and mark them as checked.
2. Identify which items the user wants to UNCHECK (return to pending) — e.g. "טעיתי עם החלב", "תחזיר את הביצים".
3. Identify if the user wants to ADD new items. IMPORTANT: Before adding, check if the item already exists in the list (pending or completed). If it does, DO NOT add it again. Instead, tell the user it's already in the list.
4. Identify if the user wants to EDIT/RENAME an existing item — e.g. "תשנה חלב לשלושה חלב", "תעדכן ביצים לעשר ביצים".
5. Identify if the user wants to REMOVE/DELETE items from the list entirely — e.g. "תמחק את הקטשופ", "תוריד כפילויות", "יש חלב פעמיים, תוריד אחד".
6. Understand questions like 'What is left?' or 'What should I get next?' based on logical supermarket navigation.
7. Respond in natural, concise, friendly Israeli Hebrew.

CRITICAL RULES:
- NEVER add an item that already exists in the list. If the user asks to add something that exists, respond that it's already there.
- When editing, match the item name flexibly (e.g. "חלב" matches "חלב תנובה").
- When removing duplicates, keep only one instance.

You MUST return your response as a valid JSON object with these keys:
- "updatedItems": array of exact item names the user FOUND (to check off). Empty array if none.
- "uncheckedItems": array of exact item names to RETURN to pending. Empty array if none.
- "newItems": array of objects for NEW items: [{"name": "item name", "category": "category name"}]. Categories: פירות וירקות, בשר ודגים, חלב וקירור, קפואים, יבש/מזווה, לחם ומאפים, פארם וניקיון, שתייה, אחר. Empty array if none.
- "editedItems": array of objects for items to RENAME: [{"oldName": "current name", "newName": "new name"}]. Empty array if none.
- "removedItems": array of exact item names to DELETE from the list entirely. Empty array if none.
- "voiceResponse": your short verbal reply in Hebrew to be read aloud.`;

        const pendingItems = (items as ShoppingItem[]).filter((i) => !i.checked);
        const completedItems = (items as ShoppingItem[]).filter((i) => i.checked);

        const listContext = `Current shopping list state:
PENDING items (not yet found):
${pendingItems.length > 0 ? pendingItems.map((i) => `- ${i.name} (${i.category})`).join("\n") : "(none)"}

COMPLETED items (already found):
${completedItems.length > 0 ? completedItems.map((i) => `- ${i.name} (${i.category})`).join("\n") : "(none)"}

User message: ${message}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: listContext },
            ],
            model: MODEL,
            temperature: 0.3,
            response_format: { type: "json_object" },
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(responseText);

        return NextResponse.json({
            updatedItems: parsed.updatedItems || [],
            uncheckedItems: parsed.uncheckedItems || [],
            newItems: parsed.newItems || [],
            editedItems: parsed.editedItems || [],
            removedItems: parsed.removedItems || [],
            voiceResponse: parsed.voiceResponse || "",
        });
    } catch (error) {
        console.error("Assistant error:");
        console.dir(error, { depth: null });
        return NextResponse.json(
            { error: "Failed to process assistant request" },
            { status: 500 }
        );
    }
}
