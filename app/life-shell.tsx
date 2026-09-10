"use client";

import { usePathname } from "next/navigation";
import { BookOpen, House, ShoppingBasket, Archive, ListTodo } from "lucide-react";

const modules = [
  { href: "/", label: "Home", icon: House },
  { href: "/todo", label: "To-do", icon: ListTodo },
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/groceries", label: "Groceries", icon: ShoppingBasket },
  { href: "/vault", label: "Vault", icon: Archive },
];

export default function LifeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <>
    <a className="life-skip" href="#life-content">Skip to content</a>
    <header className="life-header">
      <a className="life-brand" href="/" aria-label="Life home"><span aria-hidden="true">l.</span>life</a>
      <nav className="life-navigation" aria-label="Life modules">
        {modules.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/groceries" && pathname === "/stock");
          return <a href={href} key={href} aria-current={active ? "page" : undefined}><Icon size={19} strokeWidth={1.8}/><span>{label}</span></a>;
        })}
      </nav>
      <span className="life-personal">{process.env.NODE_ENV === "development" ? "Local preview" : "Personal space"}</span>
    </header>
    <div id="life-content" tabIndex={-1}>{children}</div>
  </>;
}
