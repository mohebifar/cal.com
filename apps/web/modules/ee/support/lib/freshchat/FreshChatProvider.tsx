import type { ReactNode, Dispatch, SetStateAction } from "react";
import { createContext, useState, use } from "react";

import FreshChatScript from "./FreshChatScript";

type FreshChatContextType = { active: boolean; setActive: Dispatch<SetStateAction<boolean>> };

const FreshChatContext = createContext<FreshChatContextType>({ active: false, setActive: () => undefined });

interface FreshChatProviderProps {
  children: ReactNode;
}

export const useFreshChat = () => use(FreshChatContext);

export default function FreshChatProvider(props: FreshChatProviderProps) {
  const [active, setActive] = useState(false);

  return (
    <FreshChatContext.Provider value={{ active, setActive }}>
      {props.children}
      {active && <FreshChatScript />}
    </FreshChatContext.Provider>
  );
}
