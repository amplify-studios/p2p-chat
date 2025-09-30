import Link from 'next/link';
import { ReactNode } from 'react';

interface SidebarItemProps {
  icon?: ReactNode;
  name?: string;
  href: string;
  type: 'small' | 'default';
  disabled?: boolean;
}

export default function SidebarItem({ name, href, icon, type, disabled }: SidebarItemProps) {
  const baseClasses =
    type === 'small'
      ? 'flex-shrink-0 px-3 py-2 rounded flex items-center gap-1'
      : 'flex items-center gap-2 p-2 rounded';

  const disabledClasses = disabled ? 'opacity-50 pointer-events-none' : 'hover:bg-secondary';

  return (
    <Link href={href} className={`${baseClasses} ${disabledClasses}`}>
      {icon}
      {type === 'default' && <span>{name}</span>}
    </Link>
  );
}
