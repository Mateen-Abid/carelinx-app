import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import medicalProfessional from '@/assets/medical-professional.jpg';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  
  const { signIn, signUp, user, resendConfirmation } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for message in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
      setAuthMessage(message);
      setIsLogin(true); // Default to login when coming from booking flow
    }
    
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validatePassword = (password: string) => {
    return {
      hasUpperLower: /(?=.*[a-z])(?=.*[A-Z])/.test(password),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      hasMinLength: password.length >= 8,
      hasNumber: /\d/.test(password),
    };
  };

  const passwordValidation = validatePassword(formData.password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      await signIn(formData.email, formData.password);
    } else {
      if (formData.password !== formData.confirmPassword) {
        setLoading(false);
        return;
      }
      await signUp(formData.email, formData.password, formData.fullName);
    }
    
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleResendConfirmation = async () => {
    if (!formData.email) return;
    setLoading(true);
    await resendConfirmation(formData.email);
    setLoading(false);
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src={medicalProfessional}
          alt="Medical Professional"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-4 overflow-y-auto">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardContent className="p-0 space-y-4">
            {/* Back arrow for mobile */}
            <div className="sm:hidden mb-4">
              <button 
                onClick={() => navigate('/')}
                className="flex items-center justify-center w-8 h-8"
              >
                <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            
            {/* CARELINX Logo */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
              <span className="text-2xl font-semibold text-foreground">CARELINX</span>
            </div>

            {/* Welcome Text */}
            <div className="mb-4">
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                {isLogin ? 'Nice to see you again' : 'Welcome!'}
              </h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                    Full name
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter here"
                    className="mt-1 h-10 bg-muted border-border"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email here"
                  className="mt-1 h-10 bg-muted border-border"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••••"
                    className="h-10 bg-muted border-border pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirm Password
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="••••••••••"
                      className="h-10 bg-muted border-border pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {!isLogin && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center gap-1 ${passwordValidation.hasUpperLower ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordValidation.hasUpperLower ? <Check size={12} /> : <X size={12} />}
                    <span>Upper & lower case</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordValidation.hasSymbol ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordValidation.hasSymbol ? <Check size={12} /> : <X size={12} />}
                    <span>Symbol (!@#$)</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordValidation.hasMinLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordValidation.hasMinLength ? <Check size={12} /> : <X size={12} />}
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordValidation.hasNumber ? <Check size={12} /> : <X size={12} />}
                    <span>Number (1234)</span>
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="remember" className="text-sm text-foreground">
                      Remember me
                    </Label>
                  </div>
                  <button type="button" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || (!isLogin && !isPasswordValid)}
                className="w-full h-10 bg-[#0C2243] hover:bg-[#0C2243]/90 text-white font-medium"
              >
                {loading ? 'Loading...' : isLogin ? 'Sign in' : 'Create Account'}
              </Button>

              {!isLogin && (
                <>
                  <Button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={loading || !formData.email}
                    variant="outline"
                    className="w-full h-8 text-sm"
                  >
                    Resend Confirmation Email
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    By creating an account, you agree to the{' '}
                    <button type="button" className="text-primary hover:underline">
                      Terms of use
                    </button>{' '}
                    and{' '}
                    <button type="button" className="text-primary hover:underline">
                      Privacy Policy
                    </button>
                  </p>
                </>
              )}

              <div className="text-center pt-2">
                <span className="text-sm text-muted-foreground">
                  {isLogin ? "Don't have an account?" : "Have an account?"}
                </span>{' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {isLogin ? 'Sign up now' : 'Log in'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;