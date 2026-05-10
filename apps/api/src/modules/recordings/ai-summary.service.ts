import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface TranscriptSegment {
    start: number;
    end: number;
    speaker?: string;
    text: string;
}

interface AiSummaryResult {
    summary: string;
    actionItems: string[];
    keywords: string[];
}

@Injectable()
export class AiSummaryService {
    private readonly logger = new Logger(AiSummaryService.name);

    constructor(private config: ConfigService) {}

    async generateSummary(segments: TranscriptSegment[], meetingTitle: string): Promise<AiSummaryResult> {
        const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");

        if (!apiKey) {
            this.logger.warn("ANTHROPIC_API_KEY not set — returning placeholder summary");
            return this.placeholderSummary();
        }

        const transcript = segments
            .map((s) => {
                const speaker = s.speaker ? `${s.speaker}: ` : "";
                return `[${formatTime(s.start)}] ${speaker}${s.text}`;
            })
            .join("\n");

        const prompt = `You are summarizing a video meeting titled "${meetingTitle}". Below is the transcript with timestamps.

<transcript>
${transcript}
</transcript>

Respond with a JSON object (no markdown fences) matching exactly this schema:
{
  "summary": "<2-4 paragraph prose summary of what was discussed>",
  "actionItems": ["<action item 1>", "<action item 2>"],
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"]
}

Be concise. Action items should be specific and actionable. Keywords should capture the main topics (3-8 words).`;

        try {
            const { default: Anthropic } = await import("@anthropic-ai/sdk");
            const client = new Anthropic({ apiKey });

            const message = await client.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 1024,
                messages: [{ role: "user", content: prompt }],
            });

            const text = message.content
                .filter((b) => b.type === "text")
                .map((b) => (b as { type: "text"; text: string }).text)
                .join("");

            const parsed = JSON.parse(text);
            return {
                summary: parsed.summary ?? "",
                actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
                keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
            };
        } catch (error) {
            this.logger.error(`AI summary failed: ${(error as Error).message}`);
            return this.placeholderSummary();
        }
    }

    private placeholderSummary(): AiSummaryResult {
        return {
            summary: "AI summary unavailable. Configure ANTHROPIC_API_KEY to enable automatic meeting summaries.",
            actionItems: [],
            keywords: [],
        };
    }
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}
