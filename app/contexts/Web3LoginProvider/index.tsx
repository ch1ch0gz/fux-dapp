import {
  DEFAULT_CHAIN_ID,
  WEB3_MODAL_OPTIONS,
  NETWORKS,
} from "./providerOptions";
import { useToast } from "@chakra-ui/react";
import { WalletProvider } from "@raidguild/quiver";
import React from "react";

const Web3LoginProvider: React.FC<{ children: any }> = ({ children }) => {
  const toast = useToast();

  return (
    <WalletProvider
      web3modalOptions={WEB3_MODAL_OPTIONS}
      networks={NETWORKS}
      // Optional but useful to handle events.
      handleModalEvents={(eventName, error) => {
        if (error) {
          toast({
            title: "Error",
            description: error.message,
            status: "error",
            duration: 9000,
            isClosable: true,
          });
        }

        console.log(eventName);
      }}
    >
      {children}
    </WalletProvider>
  );
};

export { Web3LoginProvider };
