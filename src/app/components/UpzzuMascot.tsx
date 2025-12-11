'use client';

import React from 'react';

const VARIANT_CLASS = {
  home: 'upzzu-home',
  myup: 'upzzu-myup',
  customers: 'upzzu-customers',
  rebuttal: 'upzzu-rebuttal',
  sms: 'upzzu-sms',
  community: 'upzzu-community',
  chat: 'upzzu-chat',
} as const;

type UpzzuVariant = keyof typeof VARIANT_CLASS;

interface Props {
  variant: UpzzuVariant;
  size?: number;
  className?: string;
}

export function UpzzuMascot({ variant, size = 120, className }: Props) {
  const variantClass = VARIANT_CLASS[variant];

  return (
    <img
      src="/assets/upzzu-mascot.png"
      alt="UPLOG 마스코트 업쭈"
      className={`upzzu-base ${variantClass} ${className ?? ''}`}
      style={{ width: size, height: 'auto' }}
    />
  );
}
