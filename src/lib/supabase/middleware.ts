import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const pathname = request.nextUrl.pathname;

  // Supabase refresh tokens are single-use: getUser() below may rotate the
  // token pair and stage the new cookies on supabaseResponse. A plain
  // NextResponse.redirect() would discard them — the browser would keep the
  // old, already-consumed refresh token and the session would die on the
  // next request. Every redirect must go through this helper so the
  // refreshed cookies survive.
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  };

  // /auth/callback must be excluded from all middleware logic — it's a
  // one-time PKCE code exchange, not a page. Running getUser() here can
  // race with the route handler's exchangeCodeForSession and trigger
  // "flow_state_already_used" errors.
  if (pathname.startsWith("/auth/callback")) {
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/careers") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/suspended") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/profile/") ||
    pathname === "/institution/reset-password";

  if (user && isPublicPath) {
    const { data: profile } = await supabase
      .from("Profile")
      .select("isActive, role")
      .eq("id", user.id)
      .single();

    if (profile?.isActive !== false) {
      if (profile?.role === "ADMIN") {
        return redirectTo("/admin");
      }
      if (profile?.role === "INSTITUTION") {
        return redirectTo("/institution");
      }
      if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
        return redirectTo("/dashboard");
      }
      // A logged-in student/lecturer/employer opening the root URL should
      // land on their dashboard, not the marketing page — otherwise a
      // valid session "looks" logged out. Only "/" is claimed; /about,
      // /contact etc. stay reachable while logged in.
      if (pathname === "/") {
        return redirectTo("/dashboard");
      }
    }
  }

  if (!user && !isPublicPath) {
    return redirectTo("/login");
  }

  if (user && !isPublicPath) {
    const { data: profile } = await supabase
      .from("Profile")
      .select("isActive, role")
      .eq("id", user.id)
      .single();

    if (profile?.isActive === false) {
      await supabase.auth.signOut();
      return redirectTo("/suspended");
    }

    if (pathname.startsWith("/admin") && profile?.role !== "ADMIN") {
      return redirectTo("/dashboard");
    }

    if (pathname.startsWith("/institution") && profile?.role !== "INSTITUTION") {
      return redirectTo("/dashboard");
    }

    if (profile?.role === "INSTITUTION" && !pathname.startsWith("/institution")) {
      return redirectTo("/institution");
    }
  }

  return supabaseResponse;
}
