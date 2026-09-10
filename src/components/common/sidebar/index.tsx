'use client';

import { CollapsibleGroup } from '@/components/tailgrids/core/collapsible';
import { StarShopLogo } from '@/components/common/starshop-logo';
import { cn } from '@/utils/cn';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { Key } from 'react-aria-components';
import { NAV_DATA } from './data';
import { CloseIcon, SidebarExpandedIcon, ThreeDots } from './icon';
import NavItem from './nav-item';
import { findActiveGroupKey } from './utils';

export default function Sidebar({
    isSidebarOpen,
    toggleSidebar,
    isMobileSheet = false,
    onItemClick,
}: {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    isMobileSheet?: boolean;
    onItemClick?: () => void;
}) {
    const pathname = usePathname();

    // Compute which group should be open based on the current route
    const activeGroupKey = useMemo(
        () => findActiveGroupKey(pathname),
        [pathname],
    );

    const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(
        () => new Set<Key>(activeGroupKey ? [activeGroupKey] : []),
    );

    return (
        <div className='flex h-full flex-col overflow-hidden'>
            {/* Header */}
            <div
                className={cn(
                    'flex items-center text-text-primary',
                    isSidebarOpen
                        ? 'justify-between'
                        : 'flex-col justify-center gap-4',
                    isMobileSheet ? 'gap-2 px-3 pt-7' : 'px-4 pt-7',
                )}
            >
                <Link href='/' suppressHydrationWarning aria-label="Ir al panel principal">
                    <StarShopLogo compact={!isSidebarOpen} />
                </Link>

                <button
                    onClick={() => toggleSidebar()}
                    className={cn(
                        'transition-colors',
                        isMobileSheet
                            ? 'shrink-0 rounded-lg p-2.5 text-icon-tertiary hover:bg-background-gray-primary hover:text-text-primary [&_svg]:size-6'
                            : 'p-1.5 text-icon-tertiary hover:text-text-secondary',
                    )}
                    aria-label={
                        isMobileSheet ? 'Cerrar menú' : 'Alternar menú'
                    }
                >
                    {isMobileSheet ? <CloseIcon /> : <SidebarExpandedIcon />}
                </button>
            </div>

            {/* Navigation */}
            <nav
                className={cn(
                    'scrollbar-thin flex-1 overflow-y-auto',
                    isSidebarOpen ? 'mt-7 space-y-6 px-4' : 'mt-5 px-2',
                )}
            >
                <CollapsibleGroup
                    expandedKeys={expandedKeys}
                    onExpandedChange={setExpandedKeys}
                >
                    {NAV_DATA.map((section) => (
                        <div key={section.label}>
                            {/* Expanded: show section label | Collapsed: show divider between sections */}
                            {isSidebarOpen ? (
                                <p className="mt-3 mb-2 text-xs text-text-tertiary uppercase">
                                    {section.label}
                                </p>
                            ) : (
                                section.label && (
                                    <span className='flex items-center justify-center pt-6 pb-4 text-icon-secondary'>
                                        <ThreeDots />
                                    </span>
                                )
                            )}

                            <div
                                className={cn(
                                    'space-y-1',
                                    !isSidebarOpen && 'space-y-1.5',
                                )}
                            >
                                {section.items.map((item) => (
                                    <NavItem
                                        key={item.title}
                                        id={item.title}
                                        icon={item.icon}
                                        label={item.title}
                                        href={item.url}
                                        items={item.items}
                                        collapsed={!isSidebarOpen}
                                        onItemClick={onItemClick}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </CollapsibleGroup>
            </nav>

            {/* ACS — footer promo eliminado (requisito: sin publicidad Pro) */}
        </div>
    );
}
