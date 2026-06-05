import { ForceLightTheme } from "./ForceLightTheme"

// Runs during initial HTML parse, after the root next-themes script, so the
// first paint is light and there is no dark flash before hydration.
const forceLightScript = `(function(){try{var h=document.documentElement;h.classList.remove('dark');h.style.colorScheme='light';}catch(e){}})();`

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: forceLightScript }} />
      <ForceLightTheme />
      {children}
    </>
  )
}
