import DashboardShell from "@/components/layout/DashboardShell";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardShell>
            {children}
        </DashboardShell>
    );
}
