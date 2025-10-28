import Image from "next/image";

export function Navbar() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Image
              src="/kroni.png"
              alt="Kroni mascot"
              width={32}
              height={32}
              className="rounded-full"
            />
            <h1 className="text-xl font-semibold text-foreground">
              Kroni-Toudou
            </h1>
          </div>
        </div>
      </div>
    </nav>
  );
}
