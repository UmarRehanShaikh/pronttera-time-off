import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface IDCardReissueProps {
  onReissue?: () => void;
}

export function IDCardReissue({ onReissue }: IDCardReissueProps) {
  const { profile } = useAuth();
  const [isReissuing, setIsReissuing] = useState(false);

  // Calculate card status
  const issuedDate = new Date(); // In real app, this would come from profile or card records
  const validUntil = new Date(issuedDate);
  validUntil.setFullYear(validUntil.getFullYear() + 1);
  
  const today = new Date();
  const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const isExpired = daysUntilExpiry < 0;
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;

  const handleReissue = async () => {
    setIsReissuing(true);
    try {
      // Simulate API call to reissue card
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (onReissue) {
        onReissue();
      }
      
      // In a real implementation, this would:
      // 1. Update the card issuance date in the database
      // 2. Generate a new card ID number
      // 3. Log the reissue for audit purposes
      // 4. Send confirmation email
      
    } catch (error) {
      console.error('Failed to reissue card:', error);
    } finally {
      setIsReissuing(false);
    }
  };

  const getCardStatus = () => {
    if (isExpired) {
      return {
        status: 'expired',
        label: 'Expired',
        color: 'destructive',
        icon: AlertTriangle,
        message: 'Your ID card has expired. Please reissue immediately.'
      };
    }
    
    if (isExpiringSoon) {
      return {
        status: 'expiring',
        label: 'Expiring Soon',
        color: 'secondary',
        icon: AlertTriangle,
        message: `Your ID card expires in ${daysUntilExpiry} days.`
      };
    }
    
    return {
      status: 'valid',
      label: 'Valid',
      color: 'default',
      icon: CheckCircle,
      message: `Your ID card is valid for ${daysUntilExpiry} more days.`
    };
  };

  const cardStatus = getCardStatus();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Card Reissue
        </CardTitle>
        <CardDescription>
          Manage your ID card validity and reissue when needed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Card Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <cardStatus.icon className={`h-5 w-5 ${
              cardStatus.status === 'expired' ? 'text-red-500' : 
              cardStatus.status === 'expiring' ? 'text-yellow-500' : 
              'text-green-500'
            }`} />
            <div>
              <p className="font-medium">Card Status</p>
              <p className="text-sm text-muted-foreground">{cardStatus.message}</p>
            </div>
          </div>
          <Badge variant={cardStatus.color as any}>
            {cardStatus.label}
          </Badge>
        </div>

        {/* Card Details */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Issued Date</p>
            <p className="font-medium">
              {issuedDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Valid Until</p>
            <p className="font-medium">
              {validUntil.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Reissue Button */}
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleReissue}
            disabled={isReissuing}
            className="w-full"
            variant={isExpired ? 'default' : 'outline'}
          >
            {isReissuing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Reissuing Card...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {isExpired ? 'Reissue Card Now' : 'Reissue Card'}
              </>
            )}
          </Button>
          
          {!isExpired && (
            <p className="text-xs text-muted-foreground text-center">
              You can reissue your card at any time. A new validity period will start from the reissue date.
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            How Card Reissue Works:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Your current card will be marked as expired</li>
            <li>• A new card will be issued with today's date</li>
            <li>• New validity period: 1 year from reissue date</li>
            <li>• You'll receive a confirmation email</li>
            <li>• The reissue will be logged for audit purposes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
