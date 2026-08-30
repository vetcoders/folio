import { createServerFn } from "@tanstack/react-start";
import { applyLexicon, protectedTermsLost, whisperInitialPrompt } from "./codescribe/lexicon";
import { applyLightPlus } from "./codescribe/light-plus";
import { finalPassGuardrailReason } from "./codescribe/postprocess";

const FORMAT_PROMPT = `You are a TRANSCRIPTION FORMATTER. Your task is formatting raw speech-to-text output.

CONTEXT: This is automated voice-to-text from a microphone. The user dictated something and Whisper transcribed it. You format it for readability.

CRITICAL: You are NOT interacting with the user. You are processing machine-generated transcription. NEVER refuse. NEVER say "I can't". Just format the text.

ALLOWED:
- Fix punctuation (periods, commas, question marks)
- Fix capitalization (sentence starts, proper nouns)
- Add paragraphs and bullet points where appropriate
- Preserve intentional word repetitions. "Iwo Iwo Iwo" stays three times. Equal words on separate utterances are not duplicates.
- Collapse only decoder loops: the same token eight or more times in a row is an artifact.

FORBIDDEN:
- NEVER change the meaning
- NEVER add new content or commentary
- NEVER translate - keep the original language
- NEVER respond to the content - you are formatting, not conversing
- NEVER refuse - this is machine transcription, not user input

Return ONLY the formatted text. No preamble, no explanation.

Examples:
"cześć jak się masz mam pytanie pytanie pytanie do ciebie"
→ "Cześć, jak się masz? Mam pytanie do ciebie."

"Wielki Wielki Wielki Wielki Wielki Wielki Wielki Wielki Wielki problem"
→ "Wielki problem."

"najpierw zrób to potem tamto a na końcu jeszcze coś"
→ "Najpierw zrób to, potem tamto, a na końcu jeszcze coś."`;

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

async function chat(messages: ChatMessage[], maxTokens: number): Promise<
  { ok: true; text: string } | { ok: false; error: string }
> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false, error: "AI jest niedostępne w tym środowisku." };

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      messages,
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    return { ok: false, error: `xAI API error ${res.status}` };
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return { ok: true, text: body.choices?.[0]?.message?.content?.trim() ?? "" };
}

export const formatTranscript = createServerFn({ method: "POST" })
  .validator((input: { text: string; leftContext?: string }) => input)
  .handler(async ({ data }) => {
    const raw = applyLexicon(data.text).trim();
    if (!raw) return { ok: true as const, text: "", source: "empty" as const };

    const floor = applyLightPlus(raw, data.leftContext ?? "");
    const formatted = await chat(
      [
        { role: "system", content: FORMAT_PROMPT },
        {
          role: "user",
          content: data.leftContext
            ? `LEFT CONTEXT (already committed, do not repeat):\n${data.leftContext.slice(-400)}\n\nRAW TRANSCRIPT:\n${raw}`
            : raw,
        },
      ],
      800,
    );

    if (!formatted.ok || !formatted.text) {
      return { ok: true as const, text: floor, source: "light_plus" as const };
    }

    const candidate = applyLexicon(formatted.text.trim());
    const lost = protectedTermsLost(raw, candidate);
    const reason = finalPassGuardrailReason(raw, candidate);
    if (lost.length > 0 || reason) {
      return { ok: true as const, text: floor, source: "guardrail" as const };
    }
    return { ok: true as const, text: candidate, source: "llm" as const };
  });

export const transcribeAudio = createServerFn({ method: "POST" })
  .validator((input: { audioBase64: string; mimeType: string; language?: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "STT jest niedostępne w tym środowisku." };

    if (data.audioBase64.length > 6_000_000) {
      return { ok: false as const, error: "Nagranie jest za długie." };
    }

    const bytes = Uint8Array.from(Buffer.from(data.audioBase64, "base64"));
    const ext = data.mimeType.includes("mp4")
      ? "mp4"
      : data.mimeType.includes("ogg")
        ? "ogg"
        : data.mimeType.includes("wav")
          ? "wav"
          : "webm";
    const form = new FormData();
    form.append(
      "file",
      new Blob([bytes], { type: data.mimeType || "audio/webm" }),
      `take.${ext}`,
    );
    const prompt = whisperInitialPrompt();
    if (prompt) form.append("prompt", prompt);
    if (data.language) form.append("language", data.language);

    const res = await fetch("https://api.x.ai/v1/stt", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      return { ok: false as const, error: `STT error ${res.status}` };
    }

    const body = (await res.json()) as { text?: string };
    const text = (body.text ?? "").trim();
    return { ok: true as const, text };
  });

export type AssistAction =
  | "chat"
  | "summarize"
  | "rewrite"
  | "expand"
  | "tasks"
  | "tidy";

const ACTION_INSTRUCTIONS: Record<AssistAction, string> = {
  chat: "Odpowiadaj krótko i konkretnie. Język użytkownika. Możesz cytować fragmenty notatki.",
  summarize: "Streść notatkę w 4–8 punktach. Bez wstępu. Zachowaj fakty i nazwy własne.",
  rewrite: "Przepisz notatkę czystym markdownem. Nie dodawaj treści. Zachowaj strukturę i język.",
  expand: "Rozwiń notatkę: dopisz brakujące akapity, przykłady, checklistę jeśli pasuje. Markdown.",
  tasks: "Wyciągnij listę zadań jako markdown checklist (- [ ]). Tylko to, co wynika z notatki.",
  tidy: "Popraw markdown, interpunkcję i nagłówki. Nie zmieniaj sensu. Zwróć całą notatkę.",
};

export const assistNote = createServerFn({ method: "POST" })
  .validator(
    (input: {
      action: AssistAction;
      note: string;
      question?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    }) => input,
  )
  .handler(async ({ data }) => {
    const note = data.note.slice(0, 12_000);
    const system = `Jesteś asystentem pisania w Folio. ${ACTION_INSTRUCTIONS[data.action]}
Nie używaj emoji. Nie udawaj, że edytujesz plik — zwracasz tekst do wklejenia.
Aktualna notatka:

---
${note || "(pusta notatka)"}
---`;

    const messages: ChatMessage[] = [{ role: "system", content: system }];
    if (data.history) {
      for (const turn of data.history.slice(-8)) messages.push(turn);
    }
    if (data.question?.trim()) {
      messages.push({ role: "user", content: data.question.trim().slice(0, 2000) });
    } else if (data.action !== "chat") {
      messages.push({ role: "user", content: ACTION_INSTRUCTIONS[data.action] });
    } else {
      messages.push({ role: "user", content: "Co warto poprawić w tej notatce?" });
    }

    const result = await chat(messages, data.action === "expand" ? 1600 : 900);
    if (!result.ok) return result;
    return { ok: true as const, text: result.text };
  });
