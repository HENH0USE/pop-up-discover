import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, User, LogOut, LayoutDashboard } from "lucide-react";

export function Header() {
  const { user, isLoading } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <header className="nb-header">
      <div className="container nb-header__inner">
        <Link to="/" className="nb-logo">
          <span className="nb-logo__mark">
            <Truck size={18} />
          </span>
          <span>PoPoP FINDR</span>
        </Link>

        <nav className="nb-nav">
          {!isLoading && (
            <>
              {user ? (
                <>
                  <Link to="/dashboard">
                    <Button variant="ghost" size="sm">
                      <LayoutDashboard size={14} />
                      <span className="hide-sm">Dashboard</span>
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut size={14} />
                    <span className="hide-sm">Sign Out</span>
                  </Button>
                </>
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
