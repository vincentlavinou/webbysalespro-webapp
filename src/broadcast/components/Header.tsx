import { BrandMark } from "@/components/BrandMark"

const Header = () => {
    return (
      <header className="w-full border-b bg-blend-darken shadow-sm">
        <div className="mx-auto flex w-full items-center justify-between px-6 py-4">
          <BrandMark href="/" />
          <h1 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Webinar Broadcast Console
          </h1>
        </div>
      </header>
    );
  };
  
  export default Header;
  
