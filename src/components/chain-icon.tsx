import { EvmIcon, SolanaIcon, CosmosIcon } from '@/components/icons';
import { HelpCircle } from 'lucide-react';
import type { SVGProps } from 'react';

interface ChainIconProps extends SVGProps<SVGSVGElement> {
    chain: 'evm' | 'solana' | 'cosmos' | string;
}

export const ChainIcon = ({ chain, ...props }: ChainIconProps) => {
  switch (chain.toLowerCase()) {
    case 'evm':
      return <EvmIcon {...props} />;
    case 'solana':
      return <SolanaIcon {...props} />;
    case 'cosmos':
      return <CosmosIcon {...props} />;
    default:
      return <HelpCircle {...props} />;
  }
};
