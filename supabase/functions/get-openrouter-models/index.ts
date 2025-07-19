import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('get-openrouter-models function called:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Request body received:', { hasApiKey: !!requestBody.apiKey });
    
    const { apiKey } = requestBody;

    if (!apiKey || apiKey.trim() === '') {
      console.error('No API key provided');
      return new Response(JSON.stringify({ error: 'OpenRouter API key is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching models from OpenRouter API...');
    
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://lovableproject.com',
        'X-Title': 'AI Farm Assistant',
        'User-Agent': 'AI-Farm-Assistant/1.0'
      },
    });

    console.log('OpenRouter API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      let errorMessage = 'Failed to fetch models from OpenRouter';
      if (response.status === 401) {
        errorMessage = 'Invalid API key. Please check your OpenRouter API key is correct and has sufficient credits.';
      } else if (response.status === 403) {
        errorMessage = 'Access forbidden. Please verify your OpenRouter API key permissions.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      } else if (response.status >= 500) {
        errorMessage = 'OpenRouter server error. Please try again later.';
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Raw API response structure:', {
      hasData: !!data,
      hasDataArray: !!data.data,
      dataLength: data.data?.length,
      firstModelId: data.data?.[0]?.id
    });
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.error('Invalid response format from OpenRouter:', data);
      return new Response(JSON.stringify({ error: 'Invalid response format from OpenRouter API' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Filter and format models for better UX
    const formattedModels = data.data
      .filter((model: any) => model.id && model.name) // Only include models with valid id and name
      .map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || '',
        pricing: model.pricing,
        context_length: model.context_length || 4096,
        architecture: model.architecture,
        top_provider: model.top_provider,
        per_request_limits: model.per_request_limits,
      }))
      .sort((a: any, b: any) => {
        // Sort free models first, then by name
        const aIsFree = a.id.includes(':free');
        const bIsFree = b.id.includes(':free');
        if (aIsFree && !bIsFree) return -1;
        if (!aIsFree && bIsFree) return 1;
        return a.name.localeCompare(b.name);
      });

    console.log('Successfully processed models:', {
      totalModels: formattedModels.length,
      freeModels: formattedModels.filter((m: any) => m.id.includes(':free')).length
    });

    return new Response(JSON.stringify({ 
      models: formattedModels,
      total: formattedModels.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in get-openrouter-models function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});