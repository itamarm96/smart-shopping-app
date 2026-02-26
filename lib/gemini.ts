import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    console.warn("GROQ_API_KEY is not set. Groq API calls will fail.");
}

export const groq = new Groq({ apiKey: apiKey || "" });

export const MODEL = "llama-3.3-70b-versatile";
