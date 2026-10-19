import { createConfig, http } from "wagmi";
import { celo } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Solo Celo mainnet: es lo único que cuenta en la hackatón.
// `injected` cubre MiniPay, MetaMask y cualquier wallet del navegador.
export const wagmiConfig = createConfig({
  chains: [celo],
  connectors: [injected()],
  transports: {
    [celo.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
