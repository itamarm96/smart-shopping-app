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
2. Identify which items the user wants to UNCHECK (return to pending).
3. Identify if the user wants to ADD new items. If it exists, DO NOT add it again.
4. Identify if the user wants to EDIT/RENAME an existing item.
5. Identify if the user wants to REMOVE/DELETE items from the list entirely.
6. **MANDATORY NEXT ITEM RECOMMENDATION**: If the user checked off an item, you MUST look at the remaining PENDING items and recommend the NEXT MOST LOGICAL item to pick up based on standard Israeli supermarket layouts. 
   - Example layout flow: פירות וירקות -> לחם ומאפים -> חלב וקירור -> בשר ודגים -> יבש/מזווה -> קפואים -> פארם וניקיון -> שתייה.
   - If they checked off milk, suggest other dairy items or something nearby.
7. Respond in natural, concise, friendly Israeli Hebrew. The response MUST BE SHORT.
   - Example good response: "סימנתי את החלב. כדאי לך לקחת עכשיו את הגבינה הצהובה שנמצאת באותו אזור."
   - Example bad response: "שלום! מצאת חלב. הורדתי אותו. כעת נותרו לך 5 פריטים. האפשרויות שלך הן..."

You MUST return your response as a valid JSON object with these keys:
- "updatedItems": array of exact item names the user FOUND.
- "uncheckedItems": array of exact item names to RETURN to pending.
- "newItems": array of objects for NEW items: [{"name": "item", "category": "category"}].
- "editedItems": array of objects for items to RENAME: [{"oldName": "old", "newName": "new"}].
- "removedItems": array of exact item names to DELETE.
- "voiceResponse": your short, verbal reply in Hebrew to be read aloud, including the next item recommendation if applicable.`;

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
