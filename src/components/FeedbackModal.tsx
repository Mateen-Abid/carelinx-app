import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  clinicName: string;
  doctorName: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  clinicName,
  doctorName
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleStarClick = (starIndex: number) => {
    setRating(starIndex);
  };

  const handleStarHover = (starIndex: number) => {
    setHoveredRating(starIndex);
  };


  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        description: "Please rate your experience before submitting.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate a brief loading state
    setTimeout(() => {
      toast({
        title: "Thank you for your feedback!",
        description: "Your rating helps us improve our services.",
      });

      // Close modal without saving to database
      onClose();
      setIsSubmitting(false);
    }, 1000);
  };

  const handleSkip = () => {
    // Just close the modal when skipping
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-auto bg-white rounded-2xl shadow-xl border-0 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Rate your experience</DialogTitle>
        </DialogHeader>
        <div className="p-6 text-center">
          {/* Star Rating */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((starIndex) => (
              <button
                key={starIndex}
                onClick={() => handleStarClick(starIndex)}
                onMouseEnter={() => handleStarHover(starIndex)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-all duration-200 hover:scale-110"
              >
                <Star
                  size={32}
                  className={`${
                    starIndex <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-gray-200 text-gray-200'
                  } transition-colors duration-200`}
                />
              </button>
            ))}
          </div>

          {/* Title and Description */}
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            How was your experience?
          </h2>
          <p className="text-sm text-gray-600 mb-8 px-4">
            Your feedback helps us improve our services and provide better care.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0}
              className="w-full bg-[#0C2243] hover:bg-[#0A1E3A] text-white rounded-full py-3 font-medium transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
            
            <button
              onClick={handleSkip}
              className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;