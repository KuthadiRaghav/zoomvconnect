"use client";

import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useState, useEffect, useCallback } from "react";

export interface RaisedHand {
    identity: string;
    name: string;
    raisedAt: number;
}

const LOWER_ALL_HANDS_MSG = "LOWER_ALL_HANDS";

function parseMeta(metadata?: string | null): Record<string, unknown> {
    try { return JSON.parse(metadata || "{}"); } catch { return {}; }
}

export function useHandRaise() {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
    const [isLocalHandRaised, setIsLocalHandRaised] = useState(false);

    const refresh = useCallback(() => {
        const hands: RaisedHand[] = [];

        const lm = parseMeta(localParticipant.metadata);
        if (lm.isHandRaised) {
            hands.push({
                identity: localParticipant.identity,
                name: localParticipant.name || localParticipant.identity,
                raisedAt: (lm.handRaisedAt as number) || 0,
            });
        }
        setIsLocalHandRaised(!!lm.isHandRaised);

        room.remoteParticipants.forEach((p) => {
            const m = parseMeta(p.metadata);
            if (m.isHandRaised) {
                hands.push({
                    identity: p.identity,
                    name: p.name || p.identity,
                    raisedAt: (m.handRaisedAt as number) || 0,
                });
            }
        });

        hands.sort((a, b) => a.raisedAt - b.raisedAt);
        setRaisedHands(hands);
    }, [room, localParticipant]);

    // Handle incoming data packets (for "lower all hands" broadcast)
    const onData = useCallback(
        (payload: Uint8Array) => {
            const text = new TextDecoder().decode(payload);
            if (text === LOWER_ALL_HANDS_MSG) {
                const meta = parseMeta(localParticipant.metadata);
                if (meta.isHandRaised) {
                    const newMeta = { ...meta, isHandRaised: false, handRaisedAt: undefined };
                    localParticipant.setMetadata(JSON.stringify(newMeta));
                }
            }
        },
        [localParticipant]
    );

    useEffect(() => {
        refresh();
        room.on(RoomEvent.ParticipantMetadataChanged, refresh);
        room.on(RoomEvent.ParticipantMetadataChanged, refresh);
        room.on(RoomEvent.DataReceived, onData);
        return () => {
            room.off(RoomEvent.ParticipantMetadataChanged, refresh);
            room.off(RoomEvent.ParticipantMetadataChanged, refresh);
            room.off(RoomEvent.DataReceived, onData);
        };
    }, [room, refresh, onData]);

    const toggleHand = useCallback(async () => {
        const meta = parseMeta(localParticipant.metadata);
        const raising = !meta.isHandRaised;
        const newMeta = raising
            ? { ...meta, isHandRaised: true, handRaisedAt: Date.now() }
            : { ...meta, isHandRaised: false, handRaisedAt: undefined };
        await localParticipant.setMetadata(JSON.stringify(newMeta));
    }, [localParticipant]);

    const lowerAllHands = useCallback(async () => {
        // Lower own hand
        const meta = parseMeta(localParticipant.metadata);
        if (meta.isHandRaised) {
            await localParticipant.setMetadata(
                JSON.stringify({ ...meta, isHandRaised: false, handRaisedAt: undefined })
            );
        }
        // Broadcast to all remote participants via LiveKit data channel
        const encoded = new TextEncoder().encode(LOWER_ALL_HANDS_MSG);
        await room.localParticipant.publishData(encoded, { reliable: true });
    }, [room, localParticipant]);

    return { raisedHands, isLocalHandRaised, toggleHand, lowerAllHands };
}
