import { z } from "zod";

// ===========================================
// Zod Validation Schemas
// ===========================================

// Auth schemas
export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

// Meeting schemas
export const createMeetingSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(2000).optional(),
    scheduledStart: z.string().datetime().optional(),
    scheduledEnd: z.string().datetime().optional(),
    type: z.enum(["INSTANT", "SCHEDULED", "RECURRING", "PERSONAL_ROOM"]).default("INSTANT"),
    passcode: z.string().min(4).max(20).optional(),
    waitingRoom: z.boolean().default(false),
});

export const updateMeetingSchema = createMeetingSchema.partial();

export const joinMeetingSchema = z.object({
    passcode: z.string().optional(),
    guestName: z.string().min(2).max(100).optional(),
    guestEmail: z.string().email().optional(),
});

// Participant schemas
export const updateParticipantSchema = z.object({
    role: z.enum(["HOST", "COHOST", "ATTENDEE"]).optional(),
    isMuted: z.boolean().optional(),
    isVideoOn: z.boolean().optional(),
    isHandRaised: z.boolean().optional(),
});

// Chat schemas
export const sendMessageSchema = z.object({
    content: z.string().min(1).max(2000),
    recipientId: z.string().optional(),
});

// Breakout room schemas
export const createBreakoutRoomSchema = z.object({
    name: z.string().min(1).max(100),
    participantIds: z.array(z.string()).default([]),
    duration: z.number().min(1).max(180).optional(), // minutes
});

export const assignBreakoutSchema = z.object({
    participantId: z.string(),
    breakoutRoomId: z.string().nullable(),
});

// Recording schemas
export const startRecordingSchema = z.object({
    audioOnly: z.boolean().default(false),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type JoinMeetingInput = z.infer<typeof joinMeetingSchema>;
export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateBreakoutRoomInput = z.infer<typeof createBreakoutRoomSchema>;
export type AssignBreakoutInput = z.infer<typeof assignBreakoutSchema>;
export type StartRecordingInput = z.infer<typeof startRecordingSchema>;
