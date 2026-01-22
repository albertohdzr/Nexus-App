import ChatSidebar from "@/src/components/chat/chat-sidebar";
import ChatWindow from "@/src/components/chat/chat-window";
import LeadSidePanel from "@/src/components/chat/lead-side-panel";
import { createClient } from "@/src/lib/supabase/server";
import { addLeadNote, createLeadFromChat, updateLeadBasic } from "../crm/leads/actions";

export default async function ChatPage() {
    const supabase = await createClient();
    await supabase.auth.getUser();

    return (
        <div className="flex flex-1 h-full overflow-hidden">
            <ChatSidebar />
            <ChatWindow />
            <LeadSidePanel
                updateLeadAction={updateLeadBasic}
                addLeadNoteAction={addLeadNote}
                createLeadAction={createLeadFromChat}
            />
        </div>
    );
}
