import React, { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

// Base props shared between button and link
interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: React.ReactNode;
  className?: string;
}

// Props for button element
interface ButtonElementProps extends ButtonHTMLAttributes<HTMLButtonElement>, BaseButtonProps {
  to?: undefined;
  href?: undefined;
  isExternal?: undefined;
}

// Props for Link component (react-router)
interface LinkButtonProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>, BaseButtonProps {
  to: string;
  href?: undefined;
  isExternal?: undefined;
}

// Props for regular anchor element
interface AnchorButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement>, BaseButtonProps {
  href: string;
  to?: undefined;
  isExternal?: boolean;
}

// Union type for all possible button props
type ButtonProps = ButtonElementProps | LinkButtonProps | AnchorButtonProps;

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  to,
  href,
  isExternal,
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

  // Get text color based on background to ensure good contrast
  const getTextColor = (bgColor: string) => {
    // Simple function to determine if text should be light or dark based on background
    // This is a simplified version - in a production app, you'd want a more sophisticated calculation
    const isHex = bgColor.startsWith('#');
    if (!isHex) return currentTheme.isDark ? 'white' : 'black';
    
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    return brightness > 155 ? '#000000' : '#FFFFFF';
  };

  // Get styles for the variant
  const getVariantStyles = () => {
    const primaryColor = currentTheme.colors.accentPrimary;
    const secondaryColor = currentTheme.colors.accentSecondary;
    const errorColor = currentTheme.colors.error;
    const successColor = currentTheme.colors.success;
    const borderColor = currentTheme.colors.borderColor;
    const textColor = currentTheme.colors.textPrimary;
    const bgTertiaryColor = currentTheme.colors.bgTertiary;
    
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: primaryColor,
          color: getTextColor(primaryColor),
          borderColor: 'transparent'
        };
      case 'secondary':
        return {
          backgroundColor: secondaryColor,
          color: getTextColor(secondaryColor),
          borderColor: 'transparent'
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: textColor,
          borderColor: borderColor,
          borderWidth: '1px',
          hoverBg: bgTertiaryColor
        };
      case 'danger':
        return {
          backgroundColor: errorColor,
          color: getTextColor(errorColor),
          borderColor: 'transparent'
        };
      case 'success':
        return {
          backgroundColor: successColor,
          color: getTextColor(successColor),
          borderColor: 'transparent'
        };
      default:
        return {
          backgroundColor: primaryColor,
          color: getTextColor(primaryColor),
          borderColor: 'transparent'
        };
    }
  };

  const variantStyles = getVariantStyles();

  // Combined styles
  const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${className}`;
  
  // Common style props
  const styleProps = {
    className: combinedStyles,
    style: {
      backgroundColor: variantStyles.backgroundColor,
      color: variantStyles.color,
      borderColor: variantStyles.borderColor,
      borderWidth: variantStyles.borderWidth,
      width: fullWidth ? '100%' : 'auto',
      opacity: props.disabled ? 0.6 : 1,
      cursor: props.disabled ? 'not-allowed' : 'pointer'
    },
  };

  // Check if it's a Link button (react-router)
  if (to) {
    return (
      <Link
        to={to}
        {...styleProps}
        {...props as any}
      >
        {children}
      </Link>
    );
  }

  // Check if it's an anchor element
  if (href) {
    return (
      <a
        href={href}
        {...styleProps}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...props as any}
      >
        {children}
      </a>
    );
  }

  // Default as button
  return (
    <button 
      {...styleProps}
      {...props as any}
      onClick={(e) => {
        if (props.disabled) {
          e.preventDefault();
          return;
        }
        (props as any).onClick?.(e);
      }}
    >
      {children}
    </button>
  );
};

export default Button;