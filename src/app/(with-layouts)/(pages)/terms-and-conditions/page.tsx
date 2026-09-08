import { Breadcrumbs } from '@/components/tailgrids/core/breadcrumbs';
import { Card } from '@/components/tailgrids/core/card';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Página de términos y condiciones',
};

export default function TermsAndConditionsPage() {
    return (
        <div className='mt-6 space-y-5'>
            {/* Header Section */}
            <div className='px-2 lg:px-6'>
                <div className='flex flex-col-reverse items-start justify-between gap-3 sm:flex-row sm:items-center'>
                    <h1 className='mb-1 text-[28px] leading-8 font-medium text-text-primary'>
                        Términos y condiciones
                    </h1>
                    <div>
                        <Breadcrumbs
                            dividerType='chevron'
                            items={[
                                { href: '/', label: 'Inicio' },
                                { href: '#', label: 'Páginas' },
                                {
                                    href: '/terms-and-conditions',
                                    label: 'Términos y condiciones',
                                },
                            ]}
                        />
                    </div>
                </div>

                <div className='mt-6'>
                    <Card className='p-5 md:p-8'>
                        <div className='flex max-w-200 flex-col gap-10 p-3'>
                            {/* Intellectual Property */}
                            <div className='flex flex-col gap-4'>
                                <h2 className='text-2xl leading-8 font-semibold tracking-[-0.2px] text-text-primary'>
                                    Propiedad intelectual
                                </h2>
                                <p className='text-base leading-6 font-normal tracking-[-0.2px] text-text-secondary'>
                                    Nuestro entorno digital crece sin parar y siempre
                                    se necesitan sitios web innovadores, por eso
                                    hacen falta diseñadores y desarrolladores buenos.
                                    Con más de 20 mil millones de sitios, la demanda
                                    seguirá subiendo. Quienes programan bien son los
                                    más buscados y ganan más.
                                </p>
                            </div>

                            {/* User Accounts */}
                            <div className='flex flex-col gap-6'>
                                <div className='flex flex-col gap-4'>
                                    <h2 className='text-2xl leading-8 font-semibold tracking-[-0.2px] text-text-primary'>
                                        Cuentas de usuario
                                    </h2>
                                    <p className='text-base leading-6 font-normal tracking-[-0.2px] text-text-secondary'>
                                        El mundo digital no para de crecer y necesita
                                        más sitios, así que la demanda por diseñadores
                                        y desarrolladores seguirá al alza. Quienes
                                        manejan código tienen alta demanda y mejores
                                        sueldos.
                                    </p>
                                </div>
                                <p className='text-base leading-6 font-normal tracking-[-0.2px] text-text-secondary'>
                                    Trabajar en diseño web es diseñar, construir y
                                    programar sitios de todo tipo. Incluye conversar
                                    con clientes, usar su feedback, trabajar gráficos
                                    e imágenes y usar multimedia como audio y video.
                                </p>
                            </div>

                            {/* Governing Law */}
                            <div className='flex flex-col gap-6'>
                                <h2 className='text-2xl leading-8 font-semibold tracking-[-0.2px] text-text-primary'>
                                    Ley aplicable
                                </h2>
                                <ul className='flex list-disc flex-col gap-6 pl-5 text-base leading-6 font-normal tracking-[-0.2px] text-text-secondary'>
                                    <li>
                                        El mundo digital sigue expandiéndose, así que
                                        siempre se necesitan sitios y, por lo tanto,
                                        diseñadores y desarrolladores. Con más de 20
                                        mil millones de sitios, la demanda solo va a
                                        aumentar.
                                    </li>
                                    <li>
                                        Trabajar en diseño web es diseñar, crear y
                                        programar sitios. También conversarás con
                                        clientes, usarás su feedback, harás diseño
                                        gráfico y edición de imágenes, y trabajarás
                                        con multimedia como sonido y video.
                                    </li>
                                </ul>
                            </div>

                            {/* Termination */}
                            <div className='flex flex-col gap-6'>
                                <div className='flex flex-col gap-4'>
                                    <h2 className='text-2xl leading-8 font-semibold tracking-[-0.2px] text-text-primary'>
                                        Término
                                    </h2>
                                    <p className='text-base leading-6 font-normal tracking-[-0.2px] text-text-secondary'>
                                        Como todo es cada vez más digital, siempre se
                                        necesitan sitios y los diseñadores y
                                        desarrolladores son muy demandados. Con más
                                        de 20 mil millones de sitios, la necesidad
                                        seguirá creciendo. Quienes programan bien son
                                        muy valiosos y ganan más.
                                    </p>
                                </div>
                                <p className='text-base leading-6 font-normal tracking-[-0.2px] text-text-secondary'>
                                    Trabajar en diseño de sitios es diseñar,
                                    construir y programar todo tipo de páginas.
                                    También hablarás con clientes, recibirás su
                                    feedback, harás diseño gráfico y edición de
                                    imágenes, y sumarás multimedia como audio y
                                    video.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
