import React, { useState } from 'react';
import { Loader2, ExternalLink, Leaf } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EmbeddedToolWrapperProps {
  src: string;
  title: string;
  description: string;
  category: string;
  icon: React.ElementType;
  farmingUseCase: string;
}

export function EmbeddedToolWrapper({
  src,
  title,
  description,
  category,
  icon: Icon,
  farmingUseCase
}: EmbeddedToolWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-foreground">{title}</h1>
                <Badge variant="secondary" className="text-xs">
                  {category}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{description}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Leaf className="w-3 h-3 text-green-600" />
                <span className="font-medium">Farming Application:</span>
                <span>{farmingUseCase}</span>
              </div>
            </div>
          </div>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Open in new tab
          </a>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative bg-card">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading {title}...</p>
            </div>
          </div>
        )}

        {hasError ? (
          <div className="flex items-center justify-center h-full">
            <Card className="p-6 max-w-md text-center">
              <h3 className="text-lg font-semibold mb-2">Unable to load tool</h3>
              <p className="text-muted-foreground mb-4">
                There was an error loading {title}. Please try refreshing the page or accessing it directly.
              </p>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Open tool directly
              </a>
            </Card>
          </div>
        ) : (
          <iframe
            src={src}
            className="w-full h-full border-0 rounded-lg"
            title={title}
            allowFullScreen
            onLoad={handleLoad}
            onError={handleError}
            style={{
              minHeight: 'calc(100vh - 120px)',
              filter: 'contrast(1.02) saturate(0.98)',
            }}
          />
        )}
      </div>

      {/* Branding overlay to minimize external tags */}
      <style>{`
        iframe {
          border-radius: 8px;
        }
        /* Hide common external branding elements */
        iframe::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(transparent, rgba(255,255,255,0.9));
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}