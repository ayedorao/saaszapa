import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TourStep {
  target: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  navigateTo?: string;
}

interface ProductTourProps {
  onComplete: () => void;
  onClose: () => void;
  isAdmin?: boolean;
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="pos"]',
    title: 'Punto de Venta (POS)',
    description: 'Aquí puedes procesar ventas rápidamente. Escanea códigos de barras o busca productos manualmente. Acepta diferentes métodos de pago y genera recibos automáticamente.',
    placement: 'right',
    navigateTo: 'pos'
  },
  {
    target: '[data-tour="products"]',
    title: 'Gestión de Productos',
    description: 'Administra tu catálogo de productos. Agrega nuevos artículos, edita existentes y controla el stock. Cada producto puede tener múltiples variantes con códigos de barras únicos.',
    placement: 'right',
    navigateTo: 'products'
  },
  {
    target: '[data-tour="inventory"]',
    title: 'Control de Inventario',
    description: 'Supervisa el inventario en tiempo real. Realiza ajustes de stock, registra entradas y salidas de mercancía, y mantén un historial completo de todos los movimientos.',
    placement: 'right',
    navigateTo: 'inventory'
  },
  {
    target: '[data-tour="customers"]',
    title: 'Base de Clientes',
    description: 'Gestiona información de tus clientes y su historial de compras. Los clientes pueden acumular puntos de lealtad con cada compra para canjear descuentos.',
    placement: 'right',
    navigateTo: 'customers'
  },
  {
    target: '[data-tour="returns"]',
    title: 'Devoluciones y Cambios',
    description: 'Procesa devoluciones de productos y cambios de manera sencilla. Mantén un registro completo de todas las transacciones de devolución.',
    placement: 'right',
    navigateTo: 'returns'
  },
  {
    target: '[data-tour="promotions"]',
    title: 'Promociones y Descuentos',
    description: 'Crea y gestiona promociones especiales. Configura descuentos por producto, categoría o para toda la tienda con fechas de inicio y fin.',
    placement: 'right',
    navigateTo: 'promotions'
  },
  {
    target: '[data-tour="cash"]',
    title: 'Caja Registradora',
    description: 'Gestiona tu caja registradora. Abre y cierra turnos con recuentos de efectivo iniciales y finales. Mantén un registro detallado de todas las transacciones.',
    placement: 'right',
    navigateTo: 'cash'
  },
  {
    target: '[data-tour="reports"]',
    title: 'Reportes y Análisis',
    description: 'Genera reportes detallados de ventas, inventario y desempeño. Visualiza estadísticas clave para tomar decisiones informadas sobre tu negocio.',
    placement: 'right',
    navigateTo: 'reports'
  },
  {
    target: '[data-tour="chat"]',
    title: 'Chat entre Tiendas',
    description: 'Comunícate con otras tiendas de la red. Comparte información, coordina traslados de inventario y mantente conectado con tu equipo.',
    placement: 'right',
    navigateTo: 'chat'
  },
  {
    target: '[data-tour="system-control"]',
    title: 'Control de Sistema',
    description: 'Gestiona anuncios y alertas del sistema. Crea notificaciones para informar a todas las tiendas sobre actualizaciones, incidentes o eventos importantes.',
    placement: 'right',
    navigateTo: 'system-control'
  },
  {
    target: '[data-tour="users"]',
    title: 'Gestión de Usuarios',
    description: 'Administra los usuarios del sistema. Asigna roles y permisos, activa o desactiva cuentas, y supervisa la actividad de los usuarios en todas las tiendas.',
    placement: 'right',
    navigateTo: 'users'
  },
  {
    target: '[data-tour="stores"]',
    title: 'Gestión de Tiendas',
    description: 'Administra todas las tiendas de la red. Registra nuevas sucursales, actualiza información de contacto y controla el estado de cada ubicación.',
    placement: 'right',
    navigateTo: 'stores'
  },
  {
    target: '[data-tour="registers"]',
    title: 'Administración de Cajas',
    description: 'Supervisa todas las cajas registradoras del sistema. Configura nuevas cajas, asígnalas a tiendas específicas y controla su estado operativo.',
    placement: 'right',
    navigateTo: 'registers'
  },
  {
    target: '[data-tour="chat-audit"]',
    title: 'Auditoría de Chat',
    description: 'Revisa el historial completo de conversaciones entre tiendas. Monitorea la comunicación y asegura el cumplimiento de políticas de uso.',
    placement: 'right',
    navigateTo: 'chat-audit'
  },
  {
    target: '[data-tour="profile"]',
    title: 'Tu Perfil',
    description: 'Accede a tu perfil personal. Actualiza tu información, foto y preferencias. También puedes reiniciar este tutorial cuando lo necesites.',
    placement: 'right',
    navigateTo: 'profile'
  },
  {
    target: '[data-tour="profile"]',
    title: 'Documentación del Sistema',
    description: 'En tu perfil encontrarás acceso a la documentación completa del sistema, incluyendo términos y condiciones, avisos de privacidad, información sobre el manejo de datos y arquitectura del backend. Esta sección está protegida con código de acceso.',
    placement: 'bottom'
  },
  {
    target: '[data-tour="profile"]',
    title: 'Reportar Incidentes',
    description: 'Si encuentras algún error o problema en el sistema, puedes reportarlo desde tu perfil. Los incidentes se registran en el sistema para su seguimiento y resolución en Control de Sistema.',
    placement: 'bottom'
  }
];

export default function ProductTour({ onComplete, onClose, isAdmin = false }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightPosition, setHighlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const adminSteps = ['system-control', 'users', 'stores', 'registers', 'chat-audit'];
  const filteredSteps = isAdmin
    ? tourSteps
    : tourSteps.filter(step => !adminSteps.some(adminStep => step.target.includes(adminStep)));

  const step = filteredSteps[currentStep];

  useEffect(() => {
    if (step.navigateTo && !isNavigating) {
      setIsNavigating(true);
      window.dispatchEvent(new CustomEvent('navigate', { detail: step.navigateTo }));
      setTimeout(() => {
        updatePositions();
        setIsNavigating(false);
      }, 100);
    } else {
      updatePositions();
    }
  }, [currentStep, step.navigateTo]);

  useEffect(() => {
    const handleResize = () => updatePositions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentStep]);

  function updatePositions() {
    const targetElement = document.querySelector(step.target);

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setHighlightPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });

      const placement = step.placement || 'right';
      let top = 0;
      let left = 0;

      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        switch (placement) {
          case 'right':
            top = rect.top + window.scrollY + (rect.height / 2) - (tooltipRect.height / 2);
            left = rect.right + window.scrollX + 20;
            break;
          case 'left':
            top = rect.top + window.scrollY + (rect.height / 2) - (tooltipRect.height / 2);
            left = rect.left + window.scrollX - tooltipRect.width - 20;
            break;
          case 'top':
            top = rect.top + window.scrollY - tooltipRect.height - 20;
            left = rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2);
            break;
          case 'bottom':
            top = rect.bottom + window.scrollY + 20;
            left = rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2);
            break;
        }

        if (left + tooltipRect.width > window.innerWidth) {
          left = window.innerWidth - tooltipRect.width - 20;
        }
        if (left < 20) {
          left = 20;
        }
        if (top < 20) {
          top = 20;
        }
        if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
          top = window.innerHeight + window.scrollY - tooltipRect.height - 20;
        }
      }

      setTooltipPosition({ top, left });

      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }

  function handleNext() {
    if (currentStep < filteredSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  }

  function handlePrevious() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black bg-opacity-40 transition-opacity" />

      <div
        className="absolute pointer-events-none transition-all duration-300"
        style={{
          top: `${highlightPosition.top - 8}px`,
          left: `${highlightPosition.left - 8}px`,
          width: `${highlightPosition.width + 16}px`,
          height: `${highlightPosition.height + 16}px`,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45), 0 0 20px rgba(255, 255, 255, 0.5)',
          borderRadius: '8px',
          border: '3px solid white',
        }}
      />

      <div
        ref={tooltipRef}
        className="absolute bg-white rounded-xl shadow-2xl max-w-md transition-all duration-300"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-600 mt-1">
                Paso {currentStep + 1} de {filteredSteps.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              title="Cerrar tutorial"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="mb-4">
            <div className="flex space-x-1">
              {filteredSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="text-slate-700 leading-relaxed mb-6">
            {step.description}
          </p>

          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Saltar
            </button>

            <button
              onClick={handleNext}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center space-x-2"
            >
              <span>{currentStep === filteredSteps.length - 1 ? 'Finalizar' : 'Siguiente'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
