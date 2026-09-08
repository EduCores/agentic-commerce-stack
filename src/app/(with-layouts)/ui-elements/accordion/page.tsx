import ComponentPreview from '@/components/common/component-preview';
import { Breadcrumbs } from '@/components/tailgrids/core/breadcrumbs';
import { Metadata } from 'next';
import { StyleFive } from './_components/style-five';
import { StyleFour } from './_components/style-four';
import { StyleOne } from './_components/style-one';
import { StyleThree } from './_components/style-three';
import { StyleTwo } from './_components/style-two';

export const metadata: Metadata = {
    title: 'Acordeón',
};

export default function AccordionPage() {
    return (
        <div className='mt-6 space-y-5'>
            {/* Header Section */}
            <div className='flex flex-col-reverse justify-between gap-3 px-2 md:flex-row md:items-center lg:px-6'>
                <h1 className='mb-1 text-[28px] leading-8 font-medium text-text-primary'>
                    Acordeón
                </h1>

                <Breadcrumbs
                    className='gap-1 md:gap-2'
                    dividerType='chevron'
                    items={[
                        { href: '/', label: 'Inicio' },
                        { href: '#', label: 'Elementos de interfaz' },
                        { href: '/ui-elements/accordion', label: 'Acordeón' },
                    ]}
                />
            </div>

            <section className='grid gap-5 px-2 md:grid-cols-2 md:px-6'>
                <ComponentPreview title='Estilo uno'>
                    <StyleOne />
                </ComponentPreview>
                <ComponentPreview title='Estilo dos'>
                    <StyleTwo />
                </ComponentPreview>
                <ComponentPreview title='Estilo tres'>
                    <StyleThree />
                </ComponentPreview>
                <ComponentPreview title='Estilo cuatro'>
                    <StyleFour />
                </ComponentPreview>
                <ComponentPreview title='Estilo cinco'>
                    <StyleFive />
                </ComponentPreview>
            </section>
        </div>
    );
}
