// api/proxy.js - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';

const NT = "https://course.nexttoppers.com";
const AUTH = "https://auth.nexttoppers.com";
const APP_ID = "1772100600";
const DEVICE_ID = "ae2fa506-85ca-418d-a449-ec5068dc6665";
const FALLBACK_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMjQ1MDMzLCJhcHBfaWQiOiIxNzcyMTAwNjAwIiwiZGV2aWNlX2lkIjoiYWUyZmE1MDYtODVjYS00MThkLWE0NDktZWM1MDY4ZGM2NjY1IiwicGxhdGZvcm0iOiIzIiwidXNlcl90eXBlIjoxLCJpYXQiOjE3Nzg0OTQ5NjcsImV4cCI6MTc4MTA4Njk2N30.40g-NIb1n2f8oA7PPIqTgD3Y1zDrsQCpCxBajwpMaJY";
const FALLBACK_USER_ID = "3245033";

function getHeaders(token, userId) {
  return {
    "accept": "application/json, text/plain, */*",
    "app_id": APP_ID,
    "authorization": token || FALLBACK_TOKEN,
    "content-type": "application/json",
    "origin": "https://missionjeet.in",
    "platform": "3",
    "referer": "https://missionjeet.in/",
    "user_id": userId || FALLBACK_USER_ID,
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "version": "1"
  };
}

async function ntPost(endpoint, body, token, userId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
  
  try {
    const r = await fetch(`${NT}${endpoint}`, {
      method: "POST",
      headers: getHeaders(token, userId),
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!r.ok) {
      const errorText = await r.text();
      throw new Error(`Upstream ${r.status}: ${errorText}`);
    }
    return await r.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function ntGet(endpoint, token, userId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const r = await fetch(`${NT}${endpoint}`, {
      method: "GET",
      headers: getHeaders(token, userId),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!r.ok) {
      const errorText = await r.text();
      throw new Error(`Upstream ${r.status}: ${errorText}`);
    }
    return await r.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    return await handleRequest(request, body);
  } catch (error) {
    console.error("[PROXY POST ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }
}

export async function GET(request) {
  try {
    const body = {};
    return await handleRequest(request, body);
  } catch (error) {
    console.error("[PROXY GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Request failed" },
      { status: 500 }
    );
  }
}

async function handleRequest(request, body) {
  // CORS headers
  const response = NextResponse.json({ loading: true });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-User-Token, X-User-Id");

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // User token from headers
  const userToken = request.headers.get("x-user-token") || null;
  const userId = request.headers.get("x-user-id") || null;
  const token = userToken ? `Bearer ${userToken}` : FALLBACK_TOKEN;
  const uid = userId || FALLBACK_USER_ID;

  console.log(`[PROXY] Action: ${action}, User: ${uid}`);

  // SEND OTP
  if (action === "send-otp") {
    const { mobile } = body;
    if (!mobile) {
      return NextResponse.json({ error: "mobile required" }, { status: 400 });
    }

    const payload = {
      mobile,
      device_id: DEVICE_ID,
      mobile_otp_login: 1,
      otp: ""
    };

    const r = await fetch(`${AUTH}/auth/send-otp`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "app_id": APP_ID,
        "content-type": "application/json",
        "origin": "https://missionjeet.in",
        "platform": "3",
        "version": "1"
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    return NextResponse.json(data);
  }

  // VERIFY OTP
  if (action === "verify-otp") {
    const { mobile, otp } = body;
    if (!mobile || !otp) {
      return NextResponse.json({ error: "mobile and otp required" }, { status: 400 });
    }

    const payload = {
      mobile,
      otp,
      signup_needed: "0",
      device_id: DEVICE_ID
    };

    const r = await fetch(`${AUTH}/auth/verify-otp`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "app_id": APP_ID,
        "content-type": "application/json",
        "origin": "https://missionjeet.in",
        "platform": "3",
        "version": "1"
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    const newToken = data.data?.token || data.token || null;
    const newUserId = data.data?.user_id || data.user_id || null;

    return NextResponse.json({
      success: data.success || !!newToken,
      token: newToken,
      user_id: newUserId,
      message: data.message || "",
      raw: data
    });
  }

  // COURSE
  if (action === "course") {
    const data = await ntPost("/course/course-details", {
      course_id: String(body.course_id),
      parent_id: String(body.parent_id || "0")
    }, token, uid);
    return NextResponse.json(data);
  }

  // CONTENT
  if (action === "content") {
    const data = await ntPost("/course/all-content", {
      course_id: String(body.course_id),
      folder_id: String(body.folder_id || "0"),
      is_free: "",
      keyword: "",
      limit: "100",
      page: "1",
      parent_course_id: String(body.parent_course_id || "0")
    }, token, uid);
    return NextResponse.json(data);
  }

  return NextResponse.json({
    success: false,
    error: "Invalid action",
    available: ["send-otp", "verify-otp", "course", "content"]
  });
}
