import { env } from "@/lib/env";
import { fetchUser } from "@/lib/neynar";
import * as jose from "jose";
import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";

export const POST = async (req: NextRequest) => {
  let { fid, signature, address, message } = await req.json();

  // Verify signature matches custody address
  const isValidSignature = await verifyMessage({
    address,
    message,
    signature,
  });

  if (!isValidSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Generate JWT token
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const token = await new jose.SignJWT({
    fid,
    walletAddress: address,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const user = await fetchUser(fid);

  // Create the response
  const response = NextResponse.json({ success: true, user });

  // Set the auth cookie with the JWT token
  response.cookies.set({
    name: "auth_token",
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });

  return response;
};
