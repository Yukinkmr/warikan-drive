import { NextRequest, NextResponse } from "next/server";

const BACKEND =
  process.env.BACKEND_URL || "http://localhost:8001";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(_req, await params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, await params);
}

async function proxy(
  req: NextRequest,
  { path }: { path: string[] }
) {
  const pathStr = path?.length ? path.join("/") : "";
  const url = new URL(req.url);
  const search = url.searchParams.toString();
  const backendUrl = `${BACKEND}/api/v1/${pathStr}${search ? `?${search}` : ""}`;

  try {
    let body: string | undefined;
    if (req.method !== "GET" && req.method !== "DELETE") {
      const raw = await req.text();
      if (raw && raw.length > 0) {
        try {
          JSON.parse(raw);
          body = raw;
        } catch {
          body = raw;
        }
      }
    }

    const fetchHeaders: HeadersInit = {};
    if (body) {
      fetchHeaders["Content-Type"] = "application/json";
    }

    const res = await fetch(backendUrl, {
      method: req.method,
      headers: fetchHeaders,
      body,
    });

    const text = await res.text();
    const contentType = res.headers.get("content-type") || "";
    const resHeaders = new Headers();
    resHeaders.set("Content-Type", contentType);
    if (res.status === 204) {
      return new NextResponse(null, { status: 204, headers: resHeaders });
    }
    return new NextResponse(text, {
      status: res.status,
      headers: resHeaders,
    });
  } catch (e) {
    console.error("[proxy]", e);
    return NextResponse.json(
      { detail: "Backend unreachable" },
      { status: 502 }
    );
  }
}
