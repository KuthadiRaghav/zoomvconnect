import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
    const path = params.path.join("/");
    const url = `${API_URL}/${path}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    // Forward Authorization header if present
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
        headers["Authorization"] = authHeader;
    }

    try {
        const fetchOptions: RequestInit = {
            method: req.method,
            headers,
        };

        // Forward body for non-GET requests
        if (req.method !== "GET" && req.method !== "HEAD") {
            const body = await req.text();
            if (body) {
                fetchOptions.body = body;
            }
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.text();

        return new NextResponse(data, {
            status: response.status,
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "application/json",
            },
        });
    } catch (error) {
        console.error("[API Proxy] Error forwarding to:", url, error);
        return NextResponse.json(
            { message: "Failed to connect to API server", error: String(error) },
            { status: 502 }
        );
    }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
