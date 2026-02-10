import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function proxyRequest(req: NextRequest, { params }: { params: { path: string[] } }) {
    const path = params.path.join("/");
    const url = new URL(`/${path}`, API_URL);

    // Forward query params
    req.nextUrl.searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
    });

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

        const response = await fetch(url.toString(), fetchOptions);
        const data = await response.text();

        return new NextResponse(data, {
            status: response.status,
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "application/json",
            },
        });
    } catch (error) {
        console.error("[API Proxy] Error forwarding to:", url.toString(), error);
        return NextResponse.json(
            { message: "Failed to connect to API server", error: String(error) },
            { status: 502 }
        );
    }
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
    return proxyRequest(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
    return proxyRequest(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
    return proxyRequest(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
    return proxyRequest(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
    return proxyRequest(req, ctx);
}
