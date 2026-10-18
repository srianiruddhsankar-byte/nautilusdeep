// The parts of Appearance (lib/theme.ts) that the server layout needs: the
// storage key, the browser bar colours and the script that runs in <head>.
// No React here, so app/layout.tsx (a server component) can import it.

export const THEME_KEY = "deep-nautilus:theme";
// The browser bar's colour (the paper colour of each mode; app/layout.tsx).
export const THEME_COLOR = { light: "#f4efe6", dark: "#121a22" } as const;

// Runs in <head> before anything is drawn. Plain ES5 and self-contained (no
// imports reach it); same key and values as above. Any error: System.
// It also sets the browser bar's colour once the <meta> tags exist.
export const THEME_SCRIPT = `try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(THEME_KEY)}));if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);var c=${JSON.stringify(THEME_COLOR)}[t];document.addEventListener("DOMContentLoaded",function(){var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++)m[i].setAttribute("content",c)})}}catch(e){}`;
