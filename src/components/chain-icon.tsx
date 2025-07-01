import { EvmIcon, SolanaIcon, CosmosIcon, AptosIcon, SuiIcon, InjectiveIcon, TronIcon } from '@/components/icons';
import { HelpCircle, Layers, TowerControl, Repeat, Share2, Component, Bitcoin, Hexagon, Fish, Circle } from 'lucide-react';
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
    case 'tron':
      return <TronIcon {...props} />;
    case 'dydx':
      return <Repeat {...props} />;
    case 'substrate':
      return <Layers {...props} />;
    case 'beacon':
        return <TowerControl {...props} />;
    case 'starknet':
        return <Share2 {...props} />;
    case 'stacks':
        return <Component {...props} />;
    case 'utxo':
        return <Bitcoin {...props} />;
    case 'kaspa':
        return <Hexagon {...props} />;
    case 'ironfish':
        return <Fish {...props} />;
    case 'near':
        return <Circle {...props} />;
    default:
      return <HelpCircle {...props} />;
  }
};
