import Sidebar from "@/components/layout/Sidebar";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-950 text-white selection:bg-primary-500/30">
            <Sidebar />
            <main className="pl-64 min-h-screen transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
