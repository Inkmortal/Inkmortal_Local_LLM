import React, { ButtonHTMLAttributes } from 'react';
import { useTheme } from '../../context/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  ...props
}) => {
  const { currentTheme } = useTheme();

  // Base styles
  const baseStyles = 'rounded font-medium transition-all duration-200 focus:outline-none focus:ring-2 flex items-center justify-center';
  
  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return `bg-[${currentTheme.colors.accentPrimary}] text-white hover:opacity-90 focus:ring-[${currentTheme.colors.accentPrimary}] focus:ring-opacity-50`;
      case 'secondary':
        return `bg-[${currentTheme.colors.accentSecondary}] text-white hover:opacity-90 focus:ring-[${currentTheme.colors.accentSecondary}] focus:ring-opacity-50`;
      case 'outline':
        return `border border-[${currentTheme.colors.borderColor}] bg-transparent text-[${currentTheme.colors.textPrimary}] hover:bg-[${currentTheme.colors.bgTertiary}] focus:ring-[${currentTheme.colors.accentPrimary}] focus:ring-opacity-50`;
      case 'danger':
        return `bg-[${currentTheme.colors.error}] text-white hover:opacity-90 focus:ring-[${currentTheme.colors.error}] focus:ring-opacity-50`;
      case 'success':
        return `bg-[${currentTheme.colors.success}] text-white hover:opacity-90 focus:ring-[${currentTheme.colors.success}] focus:ring-opacity-50`;
      default:
        return `bg-[${currentTheme.colors.accentPrimary}] text-white hover:opacity-90 focus:ring-[${currentTheme.colors.accentPrimary}] focus:ring-opacity-50`;
    }
  };

  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';

  // Combined styles
  const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${getVariantStyles()} ${widthStyles} ${className}`;

  return (
    <button 
      className={combinedStyles}
      style={{
        // Inline styles for dynamic theme colors that can't be handled with Tailwind
        backgroundColor: variant === 'primary' ? currentTheme.colors.accentPrimary :
                         variant === 'secondary' ? currentTheme.colors.accentSecondary :
                         variant === 'danger' ? currentTheme.colors.error :
                         variant === 'success' ? currentTheme.colors.success : 'transparent',
        color: variant === 'outline' ? currentTheme.colors.textPrimary : 'white',
        borderColor: variant === 'outline' ? currentTheme.colors.borderColor : 'transparent',
      }}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;