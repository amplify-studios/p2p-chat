import Link from 'next/link';
import { ReactNode } from 'react';

interface SidebarItemProps {
  icon?: ReactNode;
  name?: string;
  href?: string;
  type: 'small' | 'default';
}

export default function SidebarItem({ name, href, icon, type }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={
        type == 'small'
          ? 'flex-shrink-0 px-3 py-2 rounded hover:bg-secondary flex items-center'
          : 'flex items-center gap-2 p-2 rounded hover:bg-secondary'
      }
    >
      {icon}
      {type == 'small' ? <></> : <span>{name}</span>}
    </Link>
  );
}
