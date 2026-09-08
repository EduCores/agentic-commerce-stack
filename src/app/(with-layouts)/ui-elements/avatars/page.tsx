import ComponentPreview from '@/components/common/component-preview';
import { Breadcrumbs } from '@/components/tailgrids/core/breadcrumbs';
import { Metadata } from 'next';
import AvatarSizesPreview from './_components/avatar-sizes';
import AvatarStatusPreview from './_components/avatar-status-indicator';

export const metadata: Metadata = {
    title: 'Avatares',
};

export default function AvatarsPage() {
    return (
        <div className='mt-6 space-y-5'>
            {/* Header Section */}
            <div className='flex flex-col-reverse justify-between gap-3 px-2 md:flex-row md:items-center lg:px-6'>
                <h1 className='mb-1 text-[28px] leading-8 font-medium text-text-primary'>
                    Avatares
                </h1>

                <Breadcrumbs
                    className='gap-1 md:gap-2'
                    dividerType='chevron'
                    items={[
                        { href: '/', label: 'Inicio' },
                        { href: '#', label: 'Elementos de interfaz' },
                        { href: '/ui-elements/avatars', label: 'Avatares' },
                    ]}
                />
            </div>

            <section className='grid gap-5 px-2 md:grid-cols-2 md:px-6'>
                <ComponentPreview title='Avatares con indicador de estado'>
                    <AvatarStatusPreview />
                </ComponentPreview>
                <ComponentPreview title='Tamaños de avatares'>
                    <AvatarSizesPreview />
                </ComponentPreview>
            </section>
        </div>
    );
}
