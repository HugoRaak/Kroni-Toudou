import { Navbar } from '@/components/navbar';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import Image from 'next/image';
import Link from 'next/link';

export default async function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar user={null} />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <Image
                src="/kroni.webp"
                alt="Kroni le dinosaure"
                width={80}
                height={80}
                style={{ height: 'auto', width: 'auto' }}
                className="mx-auto rounded-full"
                priority={true}
              />
              <h2 className="text-2xl font-bold text-foreground mt-4">Mot de passe oublié</h2>
              <p className="text-muted-foreground mt-2">
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <ForgotPasswordForm />
            </div>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

