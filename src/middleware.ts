import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'unsaid_id';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // If no anonymous ID cookie exists, generate one
  if (!request.cookies.get(COOKIE_NAME)) {
    const deviceId = crypto.randomUUID();
    response.cookies.set(COOKIE_NAME, deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // 1 year — effectively permanent for the device
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
