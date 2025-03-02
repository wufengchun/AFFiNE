import { defineRuntimeConfig, ModuleConfig } from '../../base/config';

export interface ServerFlags {
  earlyAccessControl: boolean;
  syncClientVersionCheck: boolean;
}

declare module '../../base/config' {
  interface AppConfig {
    flags: ModuleConfig<never, ServerFlags>;
  }
}

defineRuntimeConfig('flags', {
  earlyAccessControl: {
    desc: 'Only allow users with early access features to access the app',
    default: false,
  },
  syncClientVersionCheck: {
    desc: 'Only allow client with exact the same version with server to establish sync connections',
    default: false,
  },
});
