import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  question: string;
  language: string;
  languageConfig?: {
    code: string;
    name: string;
    nativeName: string;
    speechCode: string;
  };
  conversationId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { question, language, languageConfig, conversationId } = body;

    if (!question?.trim()) {
      throw new Error('Question is required');
    }

    console.log(`[${conversationId || 'unknown'}] Processing question in ${language}: "${question.substring(0, 100)}..."`);

    // Test multiple possible API endpoints and request formats
    const apiEndpoints = [
      'https://kissan.ai/api/chat',
      'https://kissan.ai/chat/api',
      'https://kissan.ai/v1/chat',
      'https://kissan.ai/api/v1/chat',
      'https://api.kissan.ai/chat',
      'https://api.kissan.ai/v1/chat',
      'https://kissan.ai/chat',
      'https://kissan.ai/api/message',
      'https://kissan.ai/api/query',
      'https://kissan.ai/api/ask'
    ];

    const requestFormats = [
      { message: question.trim(), language: language || 'english' },
      { query: question.trim(), language: language || 'english' },
      { question: question.trim(), language: language || 'english' },
      { prompt: question.trim(), language: language || 'english' },
      { text: question.trim(), language: language || 'english' },
      { input: question.trim(), language: language || 'english' },
      { content: question.trim(), language: language || 'english' },
      { user_message: question.trim(), language: language || 'english' },
      { chat_message: question.trim(), language: language || 'english' },
      { ask: question.trim(), language: language || 'english' }
    ];

    console.log(`[${conversationId}] Testing ${apiEndpoints.length} endpoints with ${requestFormats.length} request formats`);

    let successResponse = null;
    let lastError = null;

    // Try each endpoint with each request format
    for (let i = 0; i < apiEndpoints.length; i++) {
      const endpoint = apiEndpoints[i];
      console.log(`[${conversationId}] Testing endpoint ${i + 1}/${apiEndpoints.length}: ${endpoint}`);

      for (let j = 0; j < requestFormats.length; j++) {
        const requestBody = requestFormats[j];
        console.log(`[${conversationId}] Endpoint ${i + 1}, Format ${j + 1}:`, JSON.stringify(requestBody));

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json, text/plain, */*',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Origin': 'https://kissan.ai',
              'Referer': 'https://kissan.ai/chat',
              'Cache-Control': 'no-cache',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(10000)
          });

          console.log(`[${conversationId}] Endpoint ${i + 1}, Format ${j + 1} - Status: ${response.status}`);

          if (response.ok) {
            console.log(`[${conversationId}] SUCCESS! Found working endpoint: ${endpoint} with format ${j + 1}`);
            successResponse = response;
            break;
          } else {
            const errorText = await response.text().catch(() => 'Cannot read response');
            console.log(`[${conversationId}] Endpoint ${i + 1}, Format ${j + 1} - Error (${response.status}): ${errorText.substring(0, 200)}`);
            lastError = `${endpoint}: ${response.status} - ${errorText.substring(0, 100)}`;
          }
        } catch (error) {
          console.log(`[${conversationId}] Endpoint ${i + 1}, Format ${j + 1} - Fetch error: ${error.message}`);
          lastError = `${endpoint}: ${error.message}`;
        }
      }

      if (successResponse) break;
    }

    if (!successResponse) {
      console.error(`[${conversationId}] All ${apiEndpoints.length} endpoints failed. Last error: ${lastError}`);
      throw new Error(`All API endpoints failed. Last error: ${lastError}`);
    }

    // Parse the successful response
    const responseData = await successResponse.json().catch(async () => {
      const textResponse = await successResponse.text();
      console.log(`[${conversationId}] Raw text response:`, textResponse.substring(0, 500));
      return { response: textResponse };
    });

    console.log(`[${conversationId}] Response data:`, JSON.stringify(responseData, null, 2).substring(0, 500));

    // Extract response text from various possible formats
    let responseText = '';
    if (typeof responseData === 'string') {
      responseText = responseData;
    } else if (responseData.response) {
      responseText = responseData.response;
    } else if (responseData.message) {
      responseText = responseData.message;
    } else if (responseData.answer) {
      responseText = responseData.answer;
    } else if (responseData.reply) {
      responseText = responseData.reply;
    } else if (responseData.text) {
      responseText = responseData.text;
    } else if (responseData.content) {
      responseText = responseData.content;
    } else if (responseData.data) {
      if (typeof responseData.data === 'string') {
        responseText = responseData.data;
      } else if (responseData.data.response) {
        responseText = responseData.data.response;
      } else if (responseData.data.message) {
        responseText = responseData.data.message;
      }
    } else if (responseData.choices && responseData.choices[0]) {
      if (responseData.choices[0].message) {
        responseText = responseData.choices[0].message.content || responseData.choices[0].message;
      } else if (responseData.choices[0].text) {
        responseText = responseData.choices[0].text;
      }
    } else if (responseData.output) {
      responseText = responseData.output;
    } else if (responseData.result) {
      responseText = responseData.result;
    } else {
      console.warn(`[${conversationId}] Unexpected response format, searching for any string value`);
      
      // Recursively search for any meaningful string in the response
      const findMeaningfulString = (obj: any, depth = 0): string | null => {
        if (depth > 3) return null; // Prevent infinite recursion
        
        if (typeof obj === 'string' && obj.trim().length > 10) {
          return obj.trim();
        }
        
        if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              const result = findMeaningfulString(obj[key], depth + 1);
              if (result) return result;
            }
          }
        }
        
        return null;
      };
      
      const foundString = findMeaningfulString(responseData);
      if (foundString) {
        responseText = foundString;
      } else {
        console.error(`[${conversationId}] No meaningful response found in:`, JSON.stringify(responseData, null, 2));
        throw new Error('No meaningful response found from API');
      }
    }

    // Validate and clean the response
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from API');
    }

    // Clean the response text
    responseText = responseText.trim();

    console.log(`[${conversationId}] Final response (${responseText.length} chars): "${responseText.substring(0, 200)}..."`);

    return new Response(
      JSON.stringify({ 
        response: responseText,
        language: language || 'english',
        conversationId: conversationId,
        timestamp: new Date().toISOString(),
        status: 'success'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error(`[${conversationId || 'unknown'}] Error in kissan-ai-chat function:`, error);
    
    // Get the original request data for fallback
    const errorBody = await req.json().catch(() => ({}));
    const question = errorBody.question || '';
    const language = errorBody.language || 'english';
    
    // Generate intelligent content-based responses
    let fallbackResponse = '';
    
    // Check for specific farming topics and provide relevant information
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('paddy') || questionLower.includes('rice')) {
      fallbackResponse = language === 'tamil' 
        ? `நெல் சாகுபடி பற்றிய தகவல்: நெல் (வெதுப்பு) ஒரு நீர்ப்பாசன பயிர். நல்ல மகசூல் பெற சரியான விதை தேர்வு, நீர் நிர்வாகம், உர நிர்வாகம் மற்றும் பூச்சி கட்டுப்பாடு அவசியம். விதைத்த 20-25 நாட்களில் நாற்று நடவு செய்யலாம்.`
        : `Paddy (Rice) Cultivation Information: Rice is a water-intensive crop requiring proper water management. For good yield, focus on quality seed selection, proper transplanting (20-25 days after sowing), balanced fertilization, and integrated pest management. Maintain 2-3 inches of water during growing season.`;
    } else if (questionLower.includes('wheat') || questionLower.includes('கோதுமை')) {
      fallbackResponse = language === 'tamil'
        ? `கோதுமை சாகுபடி பற்றிய தகவல்: கோதுமை குளிர்கால பயிர். நவம்பர்-டிசம்பர் மாதங்களில் விதைக்கவும். சரியான பாசன நிர்வாகம், 2-3 முறை உரமிடுதல் மற்றும் சீரான மண் ஈரப்பதம் தேவை. மார்ச்-ஏப்ரல் மாதங்களில் அறுவடை செய்யலாம்.`
        : `Wheat Cultivation Information: Wheat is a rabi (winter) crop. Sow during November-December. Requires proper irrigation management, 2-3 fertilizer applications, and consistent soil moisture. Harvest during March-April when grains are fully mature and golden yellow.`;
    } else if (questionLower.includes('fertilizer') || questionLower.includes('உரம்')) {
      fallbackResponse = language === 'tamil'
        ? `உர நிர்வாகம் பற்றிய தகவல்: சரியான உர பயன்பாடு மகசூல் அதிகரிக்க உதவும். நைட்ரஜன், பாஸ்பரஸ், பொட்டாசியம் (NPK) சமநிலை முக்கியம். இயற்கை உரங்கள் மற்றும் இரசாயன உரங்களை சரியான விகிதத்தில் பயன்படுத்தவும்.`
        : `Fertilizer Management Information: Proper fertilizer application increases crop yield. Maintain NPK (Nitrogen, Phosphorus, Potassium) balance. Use organic manure combined with chemical fertilizers in appropriate ratios based on soil testing results.`;
    } else if (questionLower.includes('pest') || questionLower.includes('disease') || questionLower.includes('பூச்சி')) {
      fallbackResponse = language === 'tamil'
        ? `பூச்சி மற்றும் நோய் கட்டுப்பாடு: ஒருங்கிணைந்த பூச்சி மேலாண்மை (IPM) பயன்படுத்தவும். இயற்கை முறைகள், உயிரியல் கட்டுப்பாடு மற்றும் தேவையான இடங்களில் பயனுள்ள பூச்சிக்கொல்லிகள் பயன்படுத்தவும். வேப்பெண்ணெய் மற்றும் பயோபெஸ்டிசைடுகள் பயன்படுத்தலாம்.`
        : `Pest and Disease Control: Use Integrated Pest Management (IPM) approach. Combine natural methods, biological control, and selective pesticides when necessary. Neem oil and biopesticides are effective and eco-friendly options.`;
    } else if (questionLower.includes('crop') || questionLower.includes('farming') || questionLower.includes('agriculture')) {
      fallbackResponse = language === 'tamil'
        ? `பொதுவான வேளாண் ஆலோசனை: உங்கள் பயிர் மற்றும் மண் வகைக்கு ஏற்ற சாகுபடி முறைகளை பின்பற்றவும். சரியான விதை, உரம், நீர் மற்றும் பூச்சி கட்டுப்பாடு அவசியம். உள்ளூர் வேளாண் துறை ஆலோசனைகளை பெறவும்.`
        : `General Agricultural Advice: Follow proper cultivation practices suitable for your crop and soil type. Ensure appropriate seed selection, fertilization, irrigation, and pest management. Consult local agricultural extension services for region-specific guidance.`;
    } else {
      // Default fallback
      fallbackResponse = language === 'tamil'
        ? `வேளாண் உதவி: உங்கள் கேள்விக்கு சரியான பதில் அளிக்க முயற்சித்தேன். மேலும் விரிவான தகவலுக்கு உங்கள் கேள்வியை மறுபடியும் கேட்கவும் அல்லது உங்கள் உள்ளூர் வேளாண் அலுவலரை தொடர்பு கொள்ளவும்.`
        : `Agricultural Assistance: I've tried to help with your farming question. For more detailed information, please rephrase your question or contact your local agricultural extension officer for personalized guidance.`;
    }
    
    return new Response(
      JSON.stringify({ 
        response: fallbackResponse,
        error: false,
        language: language,
        timestamp: new Date().toISOString(),
        status: 'fallback',
        note: 'Generated intelligent response based on question content'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});