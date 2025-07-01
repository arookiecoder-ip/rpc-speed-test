import { EvmIcon, SolanaIcon, CosmosIcon, AptosIcon, SuiIcon, InjectiveIcon } from '@/components/icons';
import { HelpCircle, Layers, TowerControl, Repeat } from 'lucide-react';
import type { SVGProps } from 'react';

interface ChainIconProps extends SVGProps<SVGSVGElement> {
    chain: string;
}

export const ChainIcon = ({ chain, ...props }: ChainIconProps) => {
  switch (chain?.toLowerCase()) {
    case 'evm':
      return <EvmIcon {...props} />;
    case 'solana':
      return <SolanaIcon {...props} />;
    case 'cosmos':
      return <CosmosIcon {...props} />;
    case 'aptos':
      return <AptosIcon {...props} />;
    case 'sui':
      return <SuiIcon {...props} />;
    case 'injective':
      return <InjectiveIcon {...props} />;
    case 'dydx':
      return <Repeat {...props} />;
    case 'substrate':
      return <Layers {...props} />;
    case 'beacon':
        return <TowerControl {...props} />;
    default:
      return <HelpCircle {...props} />;
  }
};
