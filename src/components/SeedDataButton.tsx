import { useState } from 'react';
import { seedBasicData } from '../utils/seedData';
import { Database, CheckCircle, AlertCircle } from 'lucide-react';

export default function SeedDataButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  async function handleSeedData() {
    setLoading(true);
    setStatus('idle');
    
    try {
      await seedBasicData();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Error seeding data:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleSeedData}
        disabled={loading}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors
          ${loading 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        `}
      >
        <Database className="w-4 h-4" />
        <span>{loading ? 'Creando...' : 'Crear Tallas y Colores'}</span>
      </button>

      {status === 'success' && (
        <div className="flex items-center space-x-1 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">Datos creados exitosamente</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center space-x-1 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Error al crear datos</span>
        </div>
      )}
    </div>
  );
}