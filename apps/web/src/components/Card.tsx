import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'white' | 'cream' | 'yellow' | 'mint' | 'sky';
}

const bgMap = {
  white: 'bg-white',
  cream: 'bg-cartoon-cream',
  yellow: 'bg-cartoon-yellow/20',
  mint: 'bg-cartoon-mint/20',
  sky: 'bg-cartoon-sky/20',
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'white',
}) => {
  return (
    <div className={`card-cartoon p-5 sm:p-6 ${bgMap[variant]} ${className}`}>
      {children}
    </div>
  );
};
