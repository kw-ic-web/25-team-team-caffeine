import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";  

    const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    interface GoogleTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    }

    serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
        throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !user) {
        throw new Error('Unauthorized');
        }

        const { action, code, redirectUri, timeMin, timeMax } = await req.json();

        console.log(`Processing ${action} action for user ${user.id}`);

        // Exchange authorization code for tokens
        if (action === 'exchange-token') {
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
            code,
            client_id: clientId!,
            client_secret: clientSecret!,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            console.error('Token exchange failed:', error);
            throw new Error('Failed to exchange token');
        }

        const tokenData: GoogleTokenResponse = await tokenResponse.json();
        
        // Store tokens in database
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        
        const { error: dbError } = await supabase
            .from('google_tokens')
            .upsert({
            user_id: user.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt.toISOString(),
            }, {
            onConflict: 'user_id',
            });

        if (dbError) {
            console.error('Failed to store tokens:', dbError);
            throw dbError;
        }

        console.log('Tokens stored successfully');
        
        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        }

        // Get Google Calendar events
        if (action === 'get-events') {
        // Get stored token
        const { data: tokenData, error: tokenError } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (tokenError || !tokenData) {
            console.error('No token found for user');
            return new Response(
            JSON.stringify({ error: 'Not connected to Google Calendar' }),
            { 
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
            );
        }

        // Check if token is expired and refresh if needed
        let accessToken = tokenData.access_token;
        const expiresAt = new Date(tokenData.expires_at);
        
        if (expiresAt < new Date()) {
            console.log('Token expired, refreshing...');
            
            const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
            const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
            
            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                refresh_token: tokenData.refresh_token!,
                client_id: clientId!,
                client_secret: clientSecret!,
                grant_type: 'refresh_token',
            }),
            });

            if (!refreshResponse.ok) {
            const error = await refreshResponse.text();
            console.error('Token refresh failed:', error);
            throw new Error('Failed to refresh token');
            }

            const refreshData: GoogleTokenResponse = await refreshResponse.json();
            accessToken = refreshData.access_token;
            
            // Update stored token
            const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);
            await supabase
            .from('google_tokens')
            .update({
                access_token: accessToken,
                expires_at: newExpiresAt.toISOString(),
            })
            .eq('user_id', user.id);
        }

        // Fetch events from Google Calendar
        const params = new URLSearchParams({
            timeMin: timeMin || new Date().toISOString(),
            timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime',
        });

        const calendarResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
            {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            }
        );

        if (!calendarResponse.ok) {
            const error = await calendarResponse.text();
            console.error('Failed to fetch calendar events:', error);
            throw new Error('Failed to fetch calendar events');
        }

        const calendarData = await calendarResponse.json();
        console.log(`Fetched ${calendarData.items?.length || 0} events`);

        return new Response(
            JSON.stringify({ events: calendarData.items || [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        }

        // Create event in Google Calendar
        if (action === 'create-event') {
        const { title, description, startDate, endDate } = await req.json();

        // Get stored token
        const { data: tokenData, error: tokenError } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (tokenError || !tokenData) {
            console.error('No token found for user');
            return new Response(
            JSON.stringify({ error: 'Not connected to Google Calendar' }),
            { 
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
            );
        }

        let accessToken = tokenData.access_token;
        
        // Check if token is expired and refresh if needed
        const expiresAt = new Date(tokenData.expires_at);
        if (expiresAt < new Date()) {
            console.log('Token expired, refreshing...');
            
            const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
            const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
            
            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                refresh_token: tokenData.refresh_token!,
                client_id: clientId!,
                client_secret: clientSecret!,
                grant_type: 'refresh_token',
            }),
            });

            if (!refreshResponse.ok) {
            throw new Error('Failed to refresh token');
            }

            const refreshData: GoogleTokenResponse = await refreshResponse.json();
            accessToken = refreshData.access_token;
            
            const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);
            await supabase
            .from('google_tokens')
            .update({
                access_token: accessToken,
                expires_at: newExpiresAt.toISOString(),
            })
            .eq('user_id', user.id);
        }

        // Create event
        const event = {
            summary: title,
            description: description,
            start: {
            dateTime: startDate,
            timeZone: 'Asia/Seoul',
            },
            end: {
            dateTime: endDate || startDate,
            timeZone: 'Asia/Seoul',
            },
        };

        const createResponse = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
            }
        );

        if (!createResponse.ok) {
            const error = await createResponse.text();
            console.error('Failed to create event:', error);
            throw new Error('Failed to create event');
        }

        const createdEvent = await createResponse.json();
        console.log('Event created successfully:', createdEvent.id);

        return new Response(
            JSON.stringify({ success: true, event: createdEvent }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        }

        return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
        );

    } catch (error) {
        console.error('Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
        );
    }
    });
