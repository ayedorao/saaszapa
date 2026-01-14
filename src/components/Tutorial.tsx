import { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  image?: string;
}

interface TutorialProps {
  onComplete: () => void;
  onClose: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Bienvenido al Sistema de Gestión',
    description: 'Este tutorial te guiará a través de las funcionalidades principales del sistema. Puedes cerrar el tutorial en cualquier momento y reanudarlo desde tu perfil.'
  },
  {
    title: 'Panel de Productos',
    description: 'Aquí puedes gestionar tu inventario de productos. Agrega nuevos productos, edita existentes, y controla el stock. Cada producto puede tener múltiples variantes con códigos de barras únicos.'
  },
  {
    title: 'Sistema de Inventario',
    description: 'Controla el inventario de tu tienda en tiempo real. Realiza ajustes de stock, registra entradas y salidas de mercancía, y mantén un historial completo de movimientos.'
  },
  {
    title: 'Punto de Venta (POS)',
    description: 'Procesa ventas rápidamente escaneando códigos de barras o buscando productos manualmente. Acepta diferentes métodos de pago y genera recibos automáticamente.'
  },
  {
    title: 'Gestión de Clientes',
    description: 'Mantén un registro de tus clientes, su historial de compras y programa de lealtad. Los clientes ganan puntos con cada compra que pueden canjear más adelante.'
  },
  {
    title: 'Cajas Registradoras',
    description: 'Gestiona múltiples cajas registradoras y sus sesiones. Abre y cierra turnos con recuentos de efectivo, y mantén un registro completo de todas las transacciones.'
  },
  {
    title: 'Sistema de Chat',
    description: 'Comunícate con otras tiendas de la red mediante el chat. Existe una sala pública para todos y puedes crear chats privados con tiendas específicas.'
  },
  {
    title: 'Reportes y Análisis',
    description: 'Genera reportes detallados de ventas, inventario y desempeño. Visualiza estadísticas importantes para tomar decisiones informadas sobre tu negocio.'
  },
  {
    title: '¡Listo para Comenzar!',
    description: 'Has completado el tutorial. Puedes volver a verlo en cualquier momento desde la sección de Perfil. ¡Ahora estás listo para usar el sistema!'
  }
];

export default function Tutorial({ onComplete, onClose }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = tutorialSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{step.title}</h2>
            <p className="text-sm text-slate-600 mt-1">
              Paso {currentStep + 1} de {tutorialSteps.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Cerrar tutorial"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="p-8">
          <div className="mb-6">
            <div className="flex space-x-1 mb-4">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="text-lg text-slate-700 leading-relaxed mb-8">
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
              Saltar Tutorial
            </button>

            <button
              onClick={handleNext}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center space-x-2"
            >
              <span>{currentStep === tutorialSteps.length - 1 ? 'Finalizar' : 'Siguiente'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
