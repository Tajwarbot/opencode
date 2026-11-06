import { createContext, useContext } from "solid-js"

/** True inside an A2UI page: a typed renderer contributes its stage and controls without a second card header. */
export const EmbeddedContext = createContext(false)

export const useEmbedded = () => useContext(EmbeddedContext) ?? false
