import type { CapacitorConfig } from '@capacitor/cli';

// Configuração da app Android (Capacitor).
// appId: identificador único na Google Play - NÃO pode mudar depois de publicar.
const config: CapacitorConfig = {
  appId: 'pt.colmeiadoce.app',
  appName: 'Colmeia Doce',
  webDir: 'dist',
  android: {
    // Sem tráfego HTTP sem encriptação (secção 11.3)
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#FBF6EA',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    // Pedidos HTTP pelo lado nativo (permite ler a hora do servidor para a proteção do relógio)
    CapacitorHttp: { enabled: true },
  },
};

export default config;
