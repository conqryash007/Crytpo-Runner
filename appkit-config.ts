import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { base } from '@reown/appkit/networks';

// WalletConnect Project ID
const projectId = '6ea112bb251f26bee4cf7a5764cd3c63';

// App metadata
const metadata = {
  name: 'Crypto Runner: Base Edition',
  description: 'Dodge Vulnerability, Build on The Base',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Create AppKit instance
createAppKit({
  adapters: [new EthersAdapter()],
  networks: [base],
  metadata,
  projectId,
  features: {
    analytics: true
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#3b82f6', // Blue accent to match game theme
    '--w3m-border-radius-master': '12px'
  }
});
