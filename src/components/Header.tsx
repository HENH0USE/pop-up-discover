import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User, LogOut, LayoutDashboard } from "lucide-react";
import { useRef } from "react";
import { useGsap } from "@/lib/animations/useGsap";
import logoUrl from "@/assets/logo.png";

export function Header() {
  const { user, isLoading } = useAuth();
  const logoRef = useRef<HTMLSpanElement>(null);

  useGsap(logoRef, (gsap, { reduce }) => {
    if (reduce) {
      gsap.set(logoRef.current, { opacity: 1, scale: 1 });
      return;
    }
    gsap.fromTo(
      logoRef.current,
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: 0.55, ease: "power3.out" },
    );
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <header className="nb-header">
      <div className="container nb-header__inner">
        <Link to="/" className="nb-logo hover-lift" aria-label="PoPoP FINDR home">
          <span className="nb-logo__mark" ref={logoRef}>
            <img src={logoUrl} alt="" width={22} height={22} decoding="async" />
          </span>
          <span>PoPoP FINDR</span>
        </Link>

        <nav className="nb-nav">
          {!isLoading && (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <LayoutDashboard size={14} />
                  <span className="hide-sm">Dashboard</span>
                </Button>
              </Link>
              {user ? (
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut size={14} />
                  <span className="hide-sm">Sign Out</span>
                </Button>
              ) : (
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    <User size={16} />
                   Vendor Sign In/Up
                  </Button>
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
