import { Toggle } from '@/components/tailgrids/core/toggle';
import { Metadata } from 'next';

const notificationSettings = [
    {
        id: 'email-notification',
        label: 'Notificación por correo',
        defaultChecked: true,
    },
    {
        id: 'push-notification',
        label: 'Notificación push',
        defaultChecked: false,
    },
    { id: 'product-update', label: 'Actualización de productos', defaultChecked: true },
    { id: 'marketing-email', label: 'Correo de marketing', defaultChecked: false },
    { id: 'security-alert', label: 'Alerta de seguridad', defaultChecked: true },
] as const;

export const metadata: Metadata = {
    title: 'Página de notificaciones',
};

export default function NotificationPage() {
    return (
        <div>
            <h2 className='mb-6 text-xl leading-7 font-semibold text-text-primary'>
                Notificaciones
            </h2>

            <div className='divide-y divide-border-secondary-alt'>
                {notificationSettings.map(({ id, label, defaultChecked }) => (
                    <div
                        key={id}
                        className='flex items-center justify-between gap-4 py-5'
                    >
                        <span
                            id={`${id}-label`}
                            className='block text-sm leading-5 font-medium text-text-primary'
                        >
                            {label}
                        </span>

                        <Toggle
                            aria-labelledby={`${id}-label`}
                            defaultChecked={defaultChecked}
                            size='md'
                            className='shrink-0'
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
