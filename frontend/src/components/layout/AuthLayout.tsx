import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">MIRA</h1>
          <p className="text-muted-foreground mt-1">Managed GRC Platform</p>
        </div>
        <div className="bg-card border rounded-lg shadow-sm p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
