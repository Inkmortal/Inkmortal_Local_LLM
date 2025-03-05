import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import { DashboardCard } from '../../types/AdminTypes';

interface DashboardCardsProps {
  cards: DashboardCard[];
  accentColors: {
    primary: string;
    secondary: string;
    tertiary: string;
    success: string;
  };
  cardIcons: { [key: string]: React.ReactNode };
}

const DashboardCards: React.FC<DashboardCardsProps> = ({ 
  cards, 
  accentColors,
  cardIcons
}) => {
  const navigate = useNavigate();

  // Get gradient for dashboard cards
  const getCardGradient = (index: number) => {
    const gradients = [
      `linear-gradient(135deg, ${accentColors.primary}15, ${accentColors.primary}05)`,
      `linear-gradient(135deg, ${accentColors.secondary}15, ${accentColors.secondary}05)`,
      `linear-gradient(135deg, ${accentColors.tertiary}15, ${accentColors.tertiary}05)`,
      `linear-gradient(135deg, ${accentColors.success}15, ${accentColors.success}05)`
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        // Determine accent color based on card ID
        const accentType = 
          card.id === 'ip-whitelist' ? 'primary' :
          card.id === 'tokens' ? 'secondary' :
          card.id === 'api-keys' ? 'tertiary' : 'primary';
        
        const accentColor = 
          accentType === 'primary' ? accentColors.primary :
          accentType === 'secondary' ? accentColors.secondary :
          accentColors.tertiary;
          
        return (
          <Card 
            key={card.id} 
            className="flex flex-col"
            hoverEffect={true}
            accentColor={accentType as any}
          >
            <div className="flex items-start justify-between mb-4">
              <div 
                className="p-3 rounded-lg transition-all hover:scale-105"
                style={{ 
                  background: getCardGradient(index),
                  boxShadow: `0 4px 15px ${accentColor}20`
                }}
              >
                <div style={{ color: accentColor }}>{cardIcons[card.id]}</div>
              </div>
              <div className="text-right">
                <h3 className="font-semibold">{card.title}</h3>
                <p className="text-3xl font-bold" style={{ color: accentColor }}>
                  {card.count}
                </p>
                {card.active !== undefined && (
                  <p className="text-sm" style={{ color: accentColors.textMuted }}>
                    {card.active} Active
                  </p>
                )}
                {card.processing !== undefined && (
                  <p className="text-sm" style={{ color: accentColors.textMuted }}>
                    {card.processing} Processing
                  </p>
                )}
              </div>
            </div>
            <button
              className="mt-auto py-2.5 text-center rounded-lg w-full transition-all hover:scale-102"
              style={{
                background: `linear-gradient(to right, ${accentColor}20, ${accentColor}30)`,
                color: accentColor,
                boxShadow: `0 2px 8px ${accentColor}20`
              }}
              onClick={() => navigate(card.path)}
            >
              View Details
            </button>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardCards;