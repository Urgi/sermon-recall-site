import { ADMIN_THEME_STORAGE_KEY } from '@/lib/theme/admin-theme';

/** Runs before paint to avoid a flash of the wrong theme. */
export function ThemeScript() {
  const code = `(function(){try{var k=${JSON.stringify(ADMIN_THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var d=document.documentElement;var m=window.matchMedia('(prefers-color-scheme: light)').matches;if(t==='light'||(t!=='dark'&&(t==='system'||!t)&&m)){d.setAttribute('data-theme','light');}else{d.setAttribute('data-theme','dark');}}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
