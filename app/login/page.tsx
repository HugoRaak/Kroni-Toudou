import { Navbar } from "@/components/navbar";
import { AuthDialog } from "@/components/auth-server";
import Image from "next/image";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const error = params.error;
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Image
              src="/kroni.png"
              alt="Kroni le dinosaure"
              width={120}
              height={120}
              className="mx-auto rounded-full"
            />
            <h2 className="text-2xl font-bold text-foreground">
              Bienvenue sur Kroni-Toudou !
            </h2>
            <p className="text-muted-foreground max-w-md">
              Connectez-vous ou créez un compte pour commencer à gérer vos tâches 
              avec votre ami Kroni le dinosaure.
            </p>
            
            {error === 'confirmation_failed' && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded max-w-md mx-auto">
                La confirmation de votre email a échoué. Veuillez réessayer ou vous inscrire à nouveau.
              </div>
            )}
            
            <div className="pt-4">
              <AuthDialog />
            </div>
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                Utilisez le bouton ci-dessus pour vous connecter ou vous inscrire.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
