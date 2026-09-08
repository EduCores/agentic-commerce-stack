import ComponentPreview from '@/components/common/component-preview';
import { Breadcrumbs } from '@/components/tailgrids/core/breadcrumbs';
import { Metadata } from 'next';
import ProgressShowcase from './_components/progress-showcase';
import ProgressVariantsPreview from './_components/progress-variants';

export const metadata: Metadata = {
    title: 'Progreso',
};

export default function ProgressPage() {
    return (
        <section className='mt-6 space-y-5'>
            {/* Header Section */}
            <div className='flex flex-col-reverse justify-between gap-3 px-2 md:flex-row md:items-center lg:px-6'>
                <h1 className='mb-1 text-[28px] leading-8 font-medium text-text-primary'>
                    Progreso
                </h1>

                <Breadcrumbs
                    className='gap-1 md:gap-2'
                    dividerType='chevron'
                    items={[
                        { href: '/', label: 'Inicio' },
                        { href: '#', label: 'Elementos de interfaz' },
                        { href: '/ui-elements/progress', label: 'Progreso' },
                    ]}
                />
            </div>

            <section className='grid gap-5 px-2 md:grid-cols-2 md:px-6'>
                <ComponentPreview title='Variantes de progreso'>
                    <ProgressVariantsPreview />
                </ComponentPreview>
                <ComponentPreview title='Ejemplos de progreso'>
                    <ProgressShowcase />
                </ComponentPreview>
            </section>
        </section>
    );
}
