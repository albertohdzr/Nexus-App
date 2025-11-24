import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role key for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'my_secure_token';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const value = body.entry[0].changes[0].value;
        const message = value.messages[0];
        const contact = value.contacts ? value.contacts[0] : null;

        const waId = contact ? contact.wa_id : message.from;
        const name = contact ? contact.profile.name : waId;
        const phoneNumber = value.metadata.display_phone_number;
        const phoneNumberId = value.metadata.phone_number_id;

        // 1. Find Organization
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('phone_number_id', phoneNumberId)
          .single();

        if (orgError || !orgData) {
          console.error('Organization not found for phone_number_id:', phoneNumberId);
          // We might want to store it in a "unassigned" state or just log it.
          // For now, let's return 200 to acknowledge receipt but log the error.
          return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        // 2. Upsert Chat linked to Organization
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .upsert(
            {
              wa_id: waId,
              name: name,
              phone_number: phoneNumber,
              organization_id: orgData.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'wa_id' }
          )
          .select()
          .single();

        if (chatError) {
          console.error('Error upserting chat:', chatError);
          return new NextResponse('Internal Server Error', { status: 500 });
        }

        // 3. Insert Message
        const { error: messageError } = await supabase.from('messages').insert({
          chat_id: chatData.id,
          wa_message_id: message.id,
          body: message.text ? message.text.body : '[Media/Other]',
          type: message.type,
          payload: message,
          created_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
        });

        if (messageError) {
          console.error('Error inserting message:', messageError);
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse('Not a WhatsApp API event', { status: 404 });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
