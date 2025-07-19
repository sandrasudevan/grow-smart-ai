import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('chat-with-ai function called:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Chat request received:', { 
      hasMessage: !!requestBody.message, 
      model: requestBody.model, 
      hasApiKey: !!requestBody.apiKey,
      messageLength: requestBody.message?.length 
    });

    const { message, model, conversationId, userContext, apiKey } = requestBody;
    
    // Extract user profile from userContext if provided
    const userProfile = userContext;

    if (!apiKey || apiKey.trim() === '') {
      console.error('No API key provided');
      return new Response(JSON.stringify({ error: 'OpenRouter API key is required. Please configure your API key in Settings.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!message || message.trim() === '') {
      console.error('No message provided');
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced agricultural AI system prompt
    const systemPrompt = `You are FarmAI Pro, an expert agricultural AI assistant with deep knowledge of modern farming, sustainable agriculture, and crop management. You provide comprehensive, well-structured responses that are both scientifically accurate and practically actionable.

USER CONTEXT: ${userContext ? `Location: ${userContext.location || 'Global'}, Farm type: ${userContext.farmType || 'General'}` : 'General farming inquiry'}

RESPONSE GUIDELINES:
1. **Structure your responses clearly** with emojis, headings, and organized sections
2. **Be comprehensive yet concise** - cover multiple aspects while staying focused
3. **Use markdown formatting** with **bold text**, bullet points, numbered lists, and proper sections
4. **Include relevant emojis** to enhance readability (🌱🌾🌽🥕🍅🌿🦠💧🌡️💰🔬📊)
5. **Provide actionable advice** that farmers can implement immediately
6. **Include scientific backing** when relevant, but keep it accessible
7. **Address potential challenges** and provide solutions
8. **Be encouraging and supportive** in your tone

RESPONSE STRUCTURE EXAMPLE:
🌱 **Quick Answer**: [Brief direct response]

**📋 Overview**
- Key points about the topic

**🔬 Scientific Background** (if relevant)
- Research-based information

**⚡ Action Steps**
1. Immediate actions
2. Short-term planning
3. Long-term considerations

**💡 Pro Tips**
- Expert insights and best practices

**⚠️ Common Challenges & Solutions**
- Potential issues and how to avoid/solve them

**💰 Economic Considerations** (if relevant)
- Cost-benefit analysis, market insights

**🌿 Sustainable Practices** (if relevant)
- Eco-friendly alternatives and methods

Always prioritize practical, actionable advice that helps farmers succeed while promoting sustainable and profitable agriculture. Be the most knowledgeable, helpful, and reliable agricultural advisor possible.`;

    const selectedModel = model || 'meta-llama/llama-3.2-3b-instruct:free';
    console.log('Using AI model:', selectedModel);

    const requestPayload = {
      model: selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 3000,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    };

    console.log('Calling OpenRouter API with timeout protection...');

    // Create a timeout promise that rejects after 25 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout - OpenRouter API took too long to respond')), 25000);
    });

    // Race between the actual request and timeout
    const response = await Promise.race([
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://lovableproject.com',
          'X-Title': 'AI Farm Assistant Pro',
          'User-Agent': 'AI-Farm-Assistant/1.0'
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(24000), // 24 second timeout
      }),
      timeoutPromise
    ]) as Response;

    console.log('OpenRouter API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      let errorMessage = 'Failed to get AI response';
      let userFriendlyMessage = '';
      
      if (response.status === 401) {
        errorMessage = 'Invalid API key';
        userFriendlyMessage = '🔑 **Authentication Error**: Your OpenRouter API key is invalid or expired.\n\n**Solutions:**\n- Check your API key in Settings\n- Verify you have credits in your OpenRouter account\n- Generate a new API key if needed';
      } else if (response.status === 402) {
        errorMessage = 'Insufficient credits';
        userFriendlyMessage = '💳 **Insufficient Credits**: Your OpenRouter account is out of credits.\n\n**Solutions:**\n- Add credits to your OpenRouter account\n- Switch to a free model\n- Check your usage limits';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded';
        userFriendlyMessage = '⏱️ **Rate Limit**: Too many requests sent.\n\n**Solutions:**\n- Wait a moment before trying again\n- Consider upgrading your OpenRouter plan\n- Try a different model';
      } else if (response.status === 422) {
        errorMessage = 'Invalid request';
        userFriendlyMessage = '❌ **Invalid Request**: The AI model couldn\'t process your request.\n\n**Solutions:**\n- Try rephrasing your question\n- Select a different AI model\n- Make your message shorter';
      } else if (response.status >= 500) {
        errorMessage = 'Server error';
        userFriendlyMessage = '🔧 **Server Error**: OpenRouter is experiencing technical difficulties.\n\n**Solutions:**\n- Try again in a few minutes\n- Check OpenRouter status page\n- Contact support if issue persists';
      } else {
        userFriendlyMessage = `🚨 **API Error** (${response.status}): ${errorText}\n\nPlease check your API configuration and try again.`;
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        userMessage: userFriendlyMessage,
        status: response.status
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('OpenRouter response data:', { 
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasContent: !!data.choices?.[0]?.message?.content,
      usage: data.usage
    });
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response structure from OpenRouter:', data);
      return new Response(JSON.stringify({ 
        error: 'Invalid response from AI service',
        userMessage: '🤖 **AI Error**: The AI service returned an invalid response.\n\nPlease try again or contact support if the issue persists.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const aiResponse = data.choices[0].message.content || 'I apologize, but I was unable to generate a helpful response. Could you please rephrase your question?';
    
    console.log('Successful AI response generated:', {
      responseLength: aiResponse.length,
      model: selectedModel,
      usage: data.usage
    });

    return new Response(JSON.stringify({ 
      response: aiResponse,
      model: selectedModel,
      conversationId,
      usage: data.usage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in chat-with-ai function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const userFriendlyMessage = `🚨 **System Error**: ${errorMessage}\n\n**What to try:**\n- Check your internet connection\n- Verify your API key in Settings\n- Try again in a moment\n- Contact support if issue persists`;
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      userMessage: userFriendlyMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});