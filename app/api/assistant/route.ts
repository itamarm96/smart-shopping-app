import { NextRequest, NextResponse } from "next/server";
import { groq, MODEL } from "@/lib/gemini";
import { ShoppingItem } from "@/lib/types";

export async function POST(req: NextRequest) {
    try {
        const { message, items } = await req.json();

        if (!message || typeof message !== "string") {
            return NextResponse.json({ error: "Missing message" }, { status: 400 });
        }

        const systemPrompt = `You are a smart supermarket assistant helping a user with their shopping list. You process voice transcripts in Hebrew. You will receive the user's current shopping list (pending and completed items) and their message.

Your goals:
1. CHECK OFF ITEMS: Identify which items the user has found and mark them as checked. YOU MUST USE THE EXACT STRING FROM THE PENDING LIST. If the list says "לחם אחיד", return "לחם אחיד".
2. UNCHECK ITEMS: Identify which items the user wants to return to pending.
3. ADD ITEMS: Identify if the user wants to ADD new items. 
   - CRITICAL: Strip out action verbs (like "תוסיף", "תביא", "אני צריך", "קניתי", "לקחתי"). If the user says "תוסיף חלב", the item name is "חלב", NOT "תוסיף" and NOT "תוסיף חלב".
   - If the item already exists in the list (pending or completed), DO NOT add it again (unless explicitly requested multiple units, but usually just ignore duplicates).
4. EDIT ITEMS: Identify if the user wants to rename an existing item.
5. REMOVE ITEMS: Identify if the user wants to completely delete items from the list.
6. MANDATORY NEXT ITEM RECOMMENDATION: If the user checked off an item, you MUST look at the remaining PENDING items and recommend the NEXT MOST LOGICAL item to pick up based on supermarket layout. 
   - CRITICAL: ONLY recommend items CURRENTLY IN THE "PENDING" LIST. NEVER invent items.
   - Layout flow: פירות וירקות -> לחם ומאפים -> חלב וקירור -> בשר ודגים -> יבש/מזווה -> קפואים -> פארם וניקיון -> שתייה.
7. VOICE RESPONSE RULES:
   - Respond in natural, concise, friendly Israeli Hebrew. MUST BE SHORT.
   - If you found and checked an item, CONFIRM IT. Do NOT say you couldn't find it.
   - If you added an item, confirm you added it. Do NOT say you didn't find it.
   - Example good response: "סימנתי את הלחם. כדאי לך לקחת עכשיו את הפיתות מאותה מחלקה."
   - If there are no items left in pending: "סימנתי. סיימת את כל הרשימה!"

You MUST return your response as a valid JSON object with these exact keys:
- "updatedItems": array of exact item names the user FOUND.
- "uncheckedItems": array of exact item names to RETURN to pending.
- "newItems": array of objects for NEW items: [{"name": "item", "category": "category"}]. Ensure "name" does NOT contain verbs.
- "editedItems": array of objects for items to RENAME: [{"oldName": "old", "newName": "new"}].
- "removedItems": array of exact item names to DELETE.
- "voiceResponse": your short, verbal reply in Hebrew to be read aloud.

EXAMPLES:
User message: "מצאתי את החלב" (Pending: "חלב תנובה", "לחם")
JSON: {"updatedItems": ["חלב תנובה"], "uncheckedItems": [], "newItems": [], "editedItems": [], "removedItems": [], "voiceResponse": "סימנתי את החלב. כדאי לך לגשת לקחת את הלחם."}

User message: "תוסיף במבה וביסלי" (Pending: "חלב")
JSON: {"updatedItems": [], "uncheckedItems": [], "newItems": [{"name": "במבה", "category": "יבש/מזווה"}, {"name": "ביסלי", "category": "יבש/מזווה"}], "editedItems": [], "removedItems": [], "voiceResponse": "הוספתי במבה וביסלי לרשימה."}`;

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

        let responseText = chatCompletion.choices[0]?.message?.content || "{}";

        // Strip markdown code block wrappers if the model hallucinated them
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();

        // Extract just the JSON object between the braces
        const firstBrace = responseText.indexOf("{");
        const lastBrace = responseText.lastIndexOf("}");

        if (firstBrace !== -1 && lastBrace !== -1) {
            responseText = responseText.substring(firstBrace, lastBrace + 1);
        }

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
