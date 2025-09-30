import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, X } from 'lucide-react';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  isOpen,
  onClose,
  message = "YOU ARE NOT LOGGED IN"
}) => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    onClose();
    navigate('/auth?mode=signup');
  };

  const handleLogIn = () => {
    onClose();
    navigate('/auth?mode=login');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xs w-full mx-4 bg-white rounded-2xl p-0 overflow-hidden">
        <div className="relative">
          <div className="text-center py-6 px-5">
            <div className="w-14 h-14 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {message}
            </h2>
            
            <p className="text-gray-600 mb-6 text-sm">
              Please sign in or create an account to continue.
            </p>
            
            <div className="space-y-2">
              <Button 
                className="w-full bg-[rgba(12,34,67,1)] hover:bg-[rgba(12,34,67,0.9)] text-white rounded-full py-2.5 font-medium text-sm"
                onClick={handleLogIn}
              >
                Log In
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-[rgba(12,34,67,1)] text-[rgba(12,34,67,1)] hover:bg-[rgba(12,34,67,0.05)] rounded-full py-2.5 font-medium text-sm"
                onClick={handleSignUp}
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};