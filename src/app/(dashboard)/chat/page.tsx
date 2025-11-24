import ChatSidebar from "@/src/components/chat/chat-sidebar";
import ChatWindow from "@/src/components/chat/chat-window";
import { createClient } from "@/src/lib/supabase/server";

export default async function ChatPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="flex flex-1 overflow-hidden">
            <ChatSidebar />
            <ChatWindow />
        </div>
    );
}
