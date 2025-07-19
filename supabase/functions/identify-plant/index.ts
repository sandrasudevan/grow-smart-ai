import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🌱 Starting plant identification...');
    
    // Get API key from environment
    const plantIdApiKey = Deno.env.get('PLANT_ID_API_KEY');
    console.log('🔑 API key available:', plantIdApiKey ? 'Yes' : 'No');
    console.log('🔑 API key length:', plantIdApiKey ? plantIdApiKey.length : 0);
    console.log('🔑 API key first 10 chars:', plantIdApiKey ? plantIdApiKey.substring(0, 10) : 'none');

    if (!plantIdApiKey) {
      console.error('❌ Plant.id API key not configured');
      return new Response(JSON.stringify({ 
        error: 'Plant identification service is not configured. Please contact support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get image from form data
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      console.error('No image provided');
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing image: ${imageFile.name}, size: ${imageFile.size} bytes`);

    // Convert image to base64
    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    console.log('Base64 conversion successful, length:', base64Image.length);

    // Call Plant.id API
    console.log('Calling Plant.id API...');
    const plantIdResponse = await fetch('https://api.plant.id/v3/identification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': plantIdApiKey,
      },
      body: JSON.stringify({
        images: [`data:image/jpeg;base64,${base64Image}`],
        similar_images: true,
        plant_details: ["common_names"]
      }),
    });

    console.log('Plant.id API response status:', plantIdResponse.status);

    if (!plantIdResponse.ok) {
      const errorText = await plantIdResponse.text();
      console.error('Plant.id API error:', plantIdResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'Plant identification service error. Please try again.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plantData = await plantIdResponse.json();
    console.log('Plant.id response received:', JSON.stringify(plantData, null, 2));

    // Parse Plant.id response
    let plantName = 'Unknown Plant';
    let confidence = 0;
    let scientificName = '';

    if (plantData.suggestions && plantData.suggestions.length > 0) {
      const bestSuggestion = plantData.suggestions[0];
      plantName = bestSuggestion.plant_name || 'Unknown Plant';
      confidence = Math.round((bestSuggestion.probability || 0) * 100);
      scientificName = bestSuggestion.plant_details?.scientific_name || '';
    } else if (plantData.results && plantData.results.length > 0) {
      const bestResult = plantData.results[0];
      plantName = bestResult.species?.scientificNameWithoutAuthor || bestResult.species?.scientificName || 'Unknown Plant';
      confidence = Math.round((bestResult.score || 0) * 100);
      scientificName = bestResult.species?.scientificName || '';
    } else {
      console.error('No plant identification results found');
      return new Response(JSON.stringify({ 
        error: 'Could not identify the plant. Please try a clearer image with better lighting.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate care instructions
    const careInstructions = generateCareInstructions(plantName);
    const healthStatus = `${confidence}% identification confidence`;

    console.log(`Plant identified: ${plantName} (${confidence}% confidence)`);

    return new Response(JSON.stringify({
      plantName,
      confidence,
      scientificName,
      careInstructions,
      healthStatus,
      allPredictions: plantData.suggestions?.slice(0, 3) || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Critical error in identify-plant function:', error);
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Generate care instructions based on plant name
function generateCareInstructions(plantName: string): string {
  const lowerName = plantName.toLowerCase();
  
  // Common plants with specific care instructions
  if (lowerName.includes('rose')) {
    return 'Roses need full sun (6+ hours daily), well-draining soil, regular watering at the base, and annual pruning. Feed with rose fertilizer during growing season. Watch for aphids and black spot disease.';
  } else if (lowerName.includes('tomato')) {
    return 'Tomatoes require full sun, consistent watering, support stakes or cages, and warm temperatures. Water at soil level to prevent leaf diseases. Harvest when fruits are firm and fully colored.';
  } else if (lowerName.includes('basil')) {
    return 'Basil loves warm weather and full sun. Water regularly but avoid wetting leaves. Pinch flowers to encourage leaf growth. Harvest leaves frequently for best flavor.';
  } else if (lowerName.includes('sunflower')) {
    return 'Sunflowers need full sun and well-draining soil. Water regularly, especially during flower development. Support tall varieties with stakes. Rich soil produces larger blooms.';
  } else if (lowerName.includes('cactus') || lowerName.includes('succulent')) {
    return 'Requires bright light and well-draining soil. Water only when soil is completely dry. Avoid overwatering as this can cause root rot. Good drainage is essential.';
  } else if (lowerName.includes('fern')) {
    return 'Prefers indirect light and high humidity. Keep soil consistently moist but not waterlogged. Mist regularly to maintain humidity. Good for shaded areas.';
  } else if (lowerName.includes('orchid')) {
    return 'Needs bright, indirect light and good air circulation. Water weekly by soaking roots, then drain completely. Use orchid-specific potting mix and fertilizer.';
  } else if (lowerName.includes('mint')) {
    return 'Grows well in partial shade with moist soil. Can be invasive, so consider container growing. Harvest regularly to prevent flowering. Very hardy and fast-growing.';
  } else if (lowerName.includes('lavender')) {
    return 'Requires full sun and well-draining, alkaline soil. Drought-tolerant once established. Prune after flowering to maintain shape. Harvest flowers just before fully open.';
  } else if (lowerName.includes('pepper')) {
    return 'Needs warm weather, full sun, and well-draining soil. Water regularly but ensure good drainage. Support heavy fruit-bearing plants. Harvest when fruits reach desired color.';
  } else {
    return 'Provide appropriate sunlight based on plant type, water when soil feels dry, ensure good drainage, and monitor for pests. Research specific care requirements for this plant variety.';
  }
}