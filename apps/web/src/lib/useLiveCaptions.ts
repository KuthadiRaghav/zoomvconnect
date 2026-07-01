"use client";

import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useState, useEffect, useCallback, useRef } from "react";

export interface CaptionSegment {
    id: string;
    speakerName: string;
    text: string;
    final: boolean;
    receivedAt: number;
}

const CAPTION_TTL_MS = 5000;

export function useLiveCaptions(enabled: boolean) {
    const room = useRoomContext();
    const [segments, setSegments] = useState<CaptionSegment[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const onTranscription = useCallback(
        (
            rawSegments: { id: string; text: string; final: boolean }[],
            participant?: { name?: string; identity: string }
        ) => {
            const speakerName = participant?.name || participant?.identity || "Speaker";
            const now = Date.now();

            setSegments((prev) => {
                const updated = [...prev];
                for (const seg of rawSegments) {
                    const idx = updated.findIndex((s) => s.id === seg.id);
                    const entry: CaptionSegment = {
                        id: seg.id,
                        speakerName,
                        text: seg.text,
                        final: seg.final,
                        receivedAt: now,
                    };
                    if (idx >= 0) {
                        updated[idx] = entry;
                    } else {
                        updated.push(entry);
                    }
                }
                // Keep only last 6 segments
                return updated.slice(-6);
            });
        },
        []
    );

    // Expire old final segments
    useEffect(() => {
        if (!enabled) {
            setSegments([]);
            return;
        }

        const tick = () => {
            const cutoff = Date.now() - CAPTION_TTL_MS;
            setSegments((prev) => prev.filter((s) => !s.final || s.receivedAt > cutoff));
        };

        timerRef.current = setInterval(tick, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [enabled]);

    useEffect(() => {
        if (!enabled) return;

        // RoomEvent.TranscriptionReceived signature:
        // (segments: TranscriptionSegment[], participant: Participant | undefined, publication: TrackPublication | undefined)
        const handler = (segs: unknown, participant: unknown) => {
            onTranscription(
                segs as { id: string; text: string; final: boolean }[],
                participant as { name?: string; identity: string } | undefined
            );
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (room as any).on(RoomEvent.TranscriptionReceived, handler);
        return () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (room as any).off(RoomEvent.TranscriptionReceived, handler);
        };
    }, [room, enabled, onTranscription]);

    return segments;
}
