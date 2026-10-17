import React from 'react';
import { sound } from '../fx/sound.js';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'yellow' | 'mint' | 'sky' | 'coral' | 'purple' | 'white';
  size?: 'sm' | 'md' | 'lg';
}

const colorMap = {
  yellow: 'bg-cartoon-yellow text-cartoon-dark hover:bg-yellow-300',
  mint: 'bg-cartoon-mint text-cartoon-dark hover:bg-green-400',
  sky: 'bg-cartoon-sky text-white hover:bg-sky-400',
  coral: 'bg-cartoon-coral text-white hover:bg-red-500',
  purple: 'bg-cartoon-purple text-white hover:bg-purple-400',
  white: 'bg-white text-cartoon-dark hover:bg-gray-50',
};

const sizeMap = {
  sm: 'px-3 py-1.5 text-sm min-h-[38px]',
  md: 'px-5 py-3 text-base min-h-[48px]',
  lg: 'px-6 py-4 text-xl min-h-[56px]',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'yellow',
  size = 'md',
  className = '',
  onClick,
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      sound.pop();
      onClick?.(e);
    }
  };

  return (
    <button
      className={`btn-cartoon ${colorMap[variant]} ${sizeMap[size]} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
