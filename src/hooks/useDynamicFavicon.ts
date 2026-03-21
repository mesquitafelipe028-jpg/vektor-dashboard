import { useEffect } from 'react';

export function useDynamicFavicon() {
  useEffect(() => {
    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    
    document.title = "Vektor | Clareza Financeira";
    if (favicon) favicon.href = "/favicon.ico";
    if (appleIcon) appleIcon.href = "/favicon.ico";
  }, []);
}
