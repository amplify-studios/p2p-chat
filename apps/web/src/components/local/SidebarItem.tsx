import Link from "next/link";
import { ReactNode } from "react";

interface SidebarItemProps {
  icon?: ReactNode;
  name: string;
  href: string;
};

export default function SidebarItem({name, href, icon}: SidebarItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 p-2 rounded hover:bg-secondary"
    >
      {icon}
      <span>{name}</span>
    </Link>
  
  );

}

