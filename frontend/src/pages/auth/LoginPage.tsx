import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setTokens, setUser } = useAuthStore();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: (data: LoginForm) =>
      apiClient.post("/auth/login/", data).then((r) => r.data),
    onSuccess: (data) => {
      setTokens(data.access, data.refresh);
      setUser(data.user);
      navigate(from, { replace: true });
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Sign in</h2>
        <p className="text-muted-foreground text-sm mt-1">Enter your credentials to continue</p>
      </div>

      {mutation.isError && (
        <div className="bg-destructive/10 text-destructive text-sm px-3 py-2 rounded-md">
          Invalid email or password.
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register("email")}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="you@example.com"
          autoComplete="email"
        />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          {...register("password")}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          autoComplete="current-password"
        />
        {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {mutation.isPending && <LoadingSpinner size="sm" />}
        Sign In
      </button>

      {import.meta.env.VITE_SSO_ENABLED === "true" && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <a
            href="/api/accounts/oidc/login/"
            className="w-full flex items-center justify-center gap-2 border rounded-md px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3" />
            </svg>
            Sign in with SSO
          </a>
        </>
      )}
    </form>
  );
}
