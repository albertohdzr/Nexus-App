import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Chat | Nexus App",
    description: "Real-time chat with customers",
};

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col">
            {children}
        </div>
    );
}
