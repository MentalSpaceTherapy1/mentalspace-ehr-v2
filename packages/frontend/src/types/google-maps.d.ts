declare global {
  interface Window {
    googleMapsLoaded?: boolean;
    initGoogleMaps?: () => void;
  }
}

export {};
