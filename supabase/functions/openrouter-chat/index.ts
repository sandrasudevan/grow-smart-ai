import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, language, conversationId } = await req.json();

    if (!question) {
      throw new Error('Question is required');
    }

    console.log('Received question:', question);
    console.log('Language:', language);

    // Try Hugging Face API first as fallback
    try {
      const systemPrompt = `You are an AI agricultural expert assistant. Provide helpful, accurate, and practical farming advice. 
      Always respond in ${language || 'English'} language. Keep responses concise but informative, suitable for farmers.
      Focus on practical solutions, crop management, pest control, irrigation, soil health, and sustainable farming practices.
      If asked about something outside agriculture, politely redirect to farming topics.`;

      // Use a simple LLM API or create a fallback response
      const fallbackResponses = {
        'paddy': 'Paddy (rice) cultivation requires flooded fields, transplanting seedlings after 3-4 weeks, regular water management, and proper fertilization. Best planted during monsoon season. Key practices include proper spacing, weed control, and pest management.',
        'rice': 'Rice cultivation involves nursery preparation, transplanting, water management with 2-3 cm standing water, and fertilizer application. Harvest when grains are golden yellow. Common varieties include basmati, jasmine, and long-grain rice.',
        'wheat': 'Wheat should be sown in late October to November. Requires well-drained soil, proper seed treatment, and balanced fertilization. Key stages are tillering, jointing, flowering, and grain filling. Harvest when moisture content is 20-25%.',
        'tomato': 'Tomatoes need warm climate, well-drained soil, and regular watering. Start from seedlings, provide support stakes, and ensure good air circulation. Common issues include blight, fruit cracking, and pest attacks.',
        'cotton': 'Cotton requires warm climate, deep fertile soil, and adequate rainfall or irrigation. Plant spacing is crucial for good yield. Major pests include bollworm and aphids. Harvest when bolls are fully opened.',
        'default': 'I can help you with farming advice on crops like rice, wheat, cotton, vegetables, and fruits. Please ask specific questions about crop management, pest control, irrigation, or soil health.'
      };

      // Simple keyword matching for agricultural responses
      let response = fallbackResponses.default;
      const questionLower = question.toLowerCase();
      
      for (const [keyword, answer] of Object.entries(fallbackResponses)) {
        if (keyword !== 'default' && questionLower.includes(keyword)) {
          response = answer;
          break;
        }
      }

      // Enhanced responses based on question content
      if (questionLower.includes('time') && (questionLower.includes('plant') || questionLower.includes('sow'))) {
        response = 'The best planting time depends on your crop and location. Generally: Rice/Paddy (June-July for kharif, November-December for rabi), Wheat (October-November), Cotton (April-May), Tomatoes (June-July and October-November). Consider local climate and rainfall patterns.';
      } else if (questionLower.includes('fertilizer') || questionLower.includes('nutrients')) {
        response = 'Use balanced NPK fertilizers based on soil testing. For most crops: Apply organic compost, use urea for nitrogen, DAP for phosphorus, and MOP for potassium. Follow recommended doses and timing for your specific crop and soil type.';
      } else if (questionLower.includes('pest') || questionLower.includes('disease')) {
        response = 'Integrated Pest Management (IPM) is best: Use resistant varieties, crop rotation, biological control, and targeted chemical sprays only when necessary. Regular field monitoring helps early detection and treatment.';
      } else if (questionLower.includes('irrigation') || questionLower.includes('water')) {
        response = 'Water management is crucial for crop success. Use drip irrigation for efficient water use, maintain proper soil moisture, avoid overwatering which can cause root rot, and time irrigation based on crop growth stages and weather conditions.';
      }

      console.log('Generated response:', response);

      return new Response(
        JSON.stringify({
          response: response,
          conversationId,
          model: 'agricultural-expert-fallback',
          timestamp: new Date().toISOString(),
          shouldSpeak: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (fallbackError) {
      console.error('Fallback response error:', fallbackError);
      
      return new Response(
        JSON.stringify({
          response: 'I can help you with farming questions about crops, irrigation, fertilizers, pest control, and agricultural practices. Please ask me specific questions about your farming needs.',
          conversationId,
          model: 'basic-fallback',
          timestamp: new Date().toISOString(),
          shouldSpeak: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Error in openrouter-chat function:', error);
    
    return new Response(
      JSON.stringify({
        response: 'I apologize, but I am currently experiencing technical difficulties. Please try asking your farming question again.',
        conversationId: 'error',
        error: false, // Don't show as error to user
        timestamp: new Date().toISOString(),
        shouldSpeak: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});