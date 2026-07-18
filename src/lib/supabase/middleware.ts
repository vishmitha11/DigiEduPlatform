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
    pathname.startsWith("/suspended") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/profile") ||
    pathname === "/institution/reset-password";

  if (user && isPublicPath) {
    const { data: profile } = await supabase
      .from("Profile")
      .select("isActive, role")
      .eq("id", user.id)
      .single();

    if (profile?.isActive !== false) {
      if (profile?.role === "ADMIN") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
      if (profile?.role === "INSTITUTION") {
        const url = request.nextUrl.clone();
        url.pathname = "/institution";
        return NextResponse.redirect(url);
      }
      if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && !isPublicPath) {
    const { data: profile } = await supabase
      .from("Profile")
      .select("isActive, role")
      .eq("id", user.id)
      .single();

    if (profile && profile.isActive === false) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/suspended";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/admin") && profile?.role !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/institution") && profile?.role !== "INSTITUTION") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (profile?.role === "INSTITUTION" && !pathname.startsWith("/institution")) {
      const url = request.nextUrl.clone();
      url.pathname = "/institution";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}