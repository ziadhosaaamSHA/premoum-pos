import PublicShell from "@/components/layout/PublicShell";

export default function PublicPagesLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
