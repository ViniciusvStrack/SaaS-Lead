export interface MetaCapabilities {
  embeddedSignup: boolean;
  coexistence: boolean;
  historicalMessages: boolean;
}

export function metaCapabilities(coexistenceValidated: boolean): MetaCapabilities {
  return {
    embeddedSignup: false,
    coexistence: coexistenceValidated,
    historicalMessages: false,
  };
}
