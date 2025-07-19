import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, IndianRupee } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MarketPrice {
  crop: string;
  price: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  market: string;
  lastUpdated: string;
}

interface MarketData {
  location: string;
  prices: MarketPrice[];
  marketTrends: {
    crop: string;
    prediction: string;
    confidence: number;
  }[];
}

const MarketPriceWidget = () => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'up') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (trend === 'down') {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return 'text-green-600 dark:text-green-400';
    if (trend === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const fetchMarketData = async () => {
    try {
      const userLocation = profile?.district && profile?.state 
        ? `${profile.district}, ${profile.state}` 
        : 'Local Market';
      
      const userCrops = profile?.crop_types || [];

      const { data, error } = await supabase.functions.invoke('market-prices', {
        body: {
          location: userLocation,
          crops: userCrops
        }
      });

      if (error) throw error;

      setMarketData(data);
    } catch (error) {
      console.error('Error fetching market data:', error);
      
      // Fallback market data
      setMarketData({
        location: "Demo Market",
        prices: [
          {
            crop: "Rice",
            price: 45,
            unit: "₹/kg",
            change: 2.5,
            trend: "up",
            market: "Local Mandi",
            lastUpdated: new Date().toISOString()
          },
          {
            crop: "Wheat",
            price: 28,
            unit: "₹/kg",
            change: -1.2,
            trend: "down",
            market: "Wholesale",
            lastUpdated: new Date().toISOString()
          }
        ],
        marketTrends: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, [profile]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Market Prices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!marketData || marketData.prices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Market Prices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No market data available for your crops.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="h-5 w-5" />
          Market Prices - {marketData.location}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {marketData.prices.slice(0, 4).map((price, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{price.crop}</div>
                <div className="text-sm text-muted-foreground">{price.market}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{price.price} {price.unit}</div>
                <div className={`flex items-center gap-1 text-sm ${getTrendColor(price.trend)}`}>
                  {getTrendIcon(price.trend, price.change)}
                  {Math.abs(price.change).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {marketData.marketTrends.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Market Insights</h4>
            <div className="space-y-2">
              {marketData.marketTrends.slice(0, 2).map((trend, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{trend.crop}</span>
                    <Badge variant="secondary">{trend.confidence}% confident</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{trend.prediction}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketPriceWidget;