import { AuthForm } from "../auth/AuthForm";

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-6 sm:px-6 lg:px-8">
      <AuthForm mode="register" />
    </main>
  );
}
