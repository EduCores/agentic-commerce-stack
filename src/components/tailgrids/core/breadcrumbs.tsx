import { cn } from '@/utils/cn';
import { ChevronRight } from '@tailgrids/icons';
import Link from 'next/link';

type PropsType = {
    items: {
        href: string;
        label: string;
        icon?: React.ReactNode;
    }[];
    dividerType?: 'slash' | 'chevron' | 'dot';
    activeHref?: string;
    className?: string;
};

export function Breadcrumbs({
    items,
    className,
    dividerType = 'slash',
}: PropsType) {
    return (
        <ol
            className={cn(
                'flex items-center gap-2',
                dividerType === 'dot' && 'gap-2',
                className,
            )}
        >
            {items.map((item, index) => (
                <li
                    key={item.href}
                    className="flex items-center gap-1 text-text-tertiary"
                >
                    {index > 0 && (
                        <Divider type={dividerType} className="flex items-center" />
                    )}

                    <Link
                        href={item.href}
                        className={cn(
                            'flex items-center gap-1 text-sm font-medium [&>svg]:size-4',
                            index + 1 === items.length && 'text-text-primary',
                        )}
                    >
                        {item.icon}
                        {item.label}
                    </Link>
                </li>
            ))}
        </ol>
    );
}

function Divider({ type, className }: { type: PropsType['dividerType']; className?: string }) {
    switch (type) {
        case 'chevron':
            return <ChevronRight className={cn('size-4', className)} />;

        case 'dot':
            return <span className={cn('size-1 rounded-full bg-text-200', className)} />;

        default:
            return <span className={cn('text-text-tertiary', className)}>/</span>;
    }
}
