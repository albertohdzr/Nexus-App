import { Metadata } from "next";
import { ChatSidebarCollapser } from "@/src/components/layout/chat-sidebar-collapser";

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
        <div className="flex h-full flex-col overflow-hidden">
            <ChatSidebarCollapser />
            {children}
        </div>
    );
}
