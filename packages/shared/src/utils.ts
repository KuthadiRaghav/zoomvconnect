// ===========================================
// Shared Utility Functions
// ===========================================

/**
 * Generate a random meeting passcode
 */
export function generatePasscode(length: number = 6): string {
    const chars = "0123456789";
    let passcode = "";
    for (let i = 0; i < length; i++) {
        passcode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return passcode;
}

/**
 * Generate a unique room name
 */
export function generateRoomName(): string {
    const segments = [
        randomWord(),
        randomWord(),
        randomWord(),
    ];
    return segments.join("-").toLowerCase();
}

const words = [
    "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel",
    "india", "juliet", "kilo", "lima", "mike", "november", "oscar", "papa",
    "quebec", "romeo", "sierra", "tango", "uniform", "victor", "whiskey",
    "xray", "yankee", "zulu",
];

function randomWord(): string {
    return words[Math.floor(Math.random() * words.length)];
}

/**
 * Format duration from seconds to human readable
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${padZero(minutes)}:${padZero(secs)}`;
    }
    return `${minutes}:${padZero(secs)}`;
}

function padZero(num: number): string {
    return num.toString().padStart(2, "0");
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + "...";
}

/**
 * Parse meeting invite link
 */
export function parseMeetingLink(url: string): { meetingId: string; passcode?: string } | null {
    try {
        const parsed = new URL(url);
        const pathParts = parsed.pathname.split("/").filter(Boolean);

        if (pathParts[0] === "meeting" && pathParts[1]) {
            return {
                meetingId: pathParts[1],
                passcode: parsed.searchParams.get("pwd") || undefined,
            };
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Generate meeting invite link
 */
export function generateMeetingLink(
    baseUrl: string,
    meetingId: string,
    passcode?: string
): string {
    const url = new URL(`/meeting/${meetingId}/join`, baseUrl);
    if (passcode) {
        url.searchParams.set("pwd", passcode);
    }
    return url.toString();
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry utility with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: { maxRetries?: number; baseDelay?: number } = {}
): Promise<T> {
    const { maxRetries = 3, baseDelay = 1000 } = options;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (attempt < maxRetries) {
                await sleep(baseDelay * Math.pow(2, attempt));
            }
        }
    }

    throw lastError;
}
