import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen p-4 flex flex-col bg-white">
      <nav className="shrink-0">
        <div className="w-fit flex gap-1 items-center">
          <Image src="/logo.svg" alt="logo" width={22} height={22} />
          <p className="font-semibold text-lg">Do-dat</p>
        </div>
      </nav>
      <main className="flex-1 flex mt-48 justify-center">{children}</main>
    </div>
  );
}
