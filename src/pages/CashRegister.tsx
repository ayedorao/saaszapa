import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { CashSession, CashRegister as CashRegisterType } from '../types/database';
import { DollarSign, Plus, Lock, Unlock, AlertCircle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

interface CashBreakdown {
  openingCash: number;
  cashSales: number;
  expectedTotal: number;
  salesDetails: Array<{
    id: string;
    total: number;
    status: string;
    session_id: string;
    cashPayment: number;
  }>;
  debugInfo: {
    totalSalesInSession: number;
    totalPaymentsFound: number;
    cashPaymentsCount: number;
  };
}

export default function CashRegister() {
  const { user } = useAuth();
  const [registers, setRegisters] = useState<CashRegisterType[]>([]);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<string>('');
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [cashBreakdown, setCashBreakdown] = useState<CashBreakdown | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  useEffect(() => {
    loadRegisters();
    loadCurrentSession();
  }, [user]);

  async function loadRegisters() {
    const snapshot = await getDocs(collection(db, 'cash_registers'));
    const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CashRegisterType[];
    const data = allData.filter((r: any) => r.active === true);

    setRegisters(data);
    if (data.length > 0 && !selectedRegister) {
      setSelectedRegister(data[0].id);
    }
  }

  async function loadCurrentSession() {
    if (!user) return;

    const q = query(
      collection(db, 'cash_sessions'),
      where('user_id', '==', user.uid),
      where('status', '==', 'open')
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const sessionData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CashSession;

      const registerDoc = await getDoc(doc(db, 'cash_registers', sessionData.register_id));
      if (registerDoc.exists()) {
        sessionData.register = { id: registerDoc.id, ...registerDoc.data() } as any;
      }

      setCurrentSession(sessionData);
    }
  }

  async function openSession() {
    if (!user || !selectedRegister || !openingCash) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'cash_sessions'), {
        register_id: selectedRegister,
        user_id: user.uid,
        status: 'open',
        opening_cash: parseFloat(openingCash),
        opened_at: new Date().toISOString(),
        notes: notes || null,
        created_at: new Date().toISOString(),
      });

      alert('Sesión de caja abierta exitosamente');
      setShowOpenModal(false);
      setOpeningCash('');
      setNotes('');
      loadCurrentSession();
    } catch (error) {
      console.error('Error opening session:', error);
      alert('Error al abrir sesión');
    } finally {
      setLoading(false);
    }
  }

  async function closeSession() {
    if (!currentSession || !closingCash || !cashBreakdown) return;

    setLoading(true);
    try {
      const closingAmount = parseFloat(closingCash);
      const expectedCash = cashBreakdown.expectedTotal;
      const difference = closingAmount - expectedCash;

      await updateDoc(doc(db, 'cash_sessions', currentSession.id), {
        status: 'closed',
        closing_cash: closingAmount,
        expected_cash: expectedCash,
        difference,
        notes,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      let message = `Sesión de caja cerrada exitosamente\n\n`;
      message += `Efectivo Inicial: $${cashBreakdown.openingCash.toFixed(2)}\n`;
      message += `Ventas en Efectivo: $${cashBreakdown.cashSales.toFixed(2)}\n`;
      message += `Esperado: $${expectedCash.toFixed(2)}\n`;
      message += `Real: $${closingAmount.toFixed(2)}\n`;
      message += `Diferencia: $${difference.toFixed(2)}`;

      if (Math.abs(difference) > 0.01) {
        message += `\n\n⚠️ Nota: ${
          difference > 0
            ? 'Hay más efectivo del esperado. Verifica que todas las ventas estén registradas.'
            : 'Falta efectivo. Verifica posibles errores de conteo o transacciones no registradas.'
        }`;
      }

      alert(message);
      setShowCloseModal(false);
      setClosingCash('');
      setNotes('');
      setCashBreakdown(null);
      setCurrentSession(null);
    } catch (error) {
      console.error('Error closing session:', error);
      alert('Error al cerrar sesión');
    } finally {
      setLoading(false);
    }
  }

  async function loadCashBreakdown() {
    if (!currentSession) return;

    setLoadingBreakdown(true);
    try {
      const salesSnapshot = await getDocs(collection(db, 'sales'));
      const allSales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const sessionSales = allSales.filter((s: any) =>
        s.session_id === currentSession.id && s.status === 'completed'
      );

      const paymentsSnapshot = await getDocs(collection(db, 'payments'));
      const allPayments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const salesDetails = sessionSales.map((sale: any) => {
        const salePayments = allPayments.filter((p: any) => p.sale_id === sale.id);
        const cashPayment = salePayments
          .filter((p: any) => p.method === 'cash' && p.status === 'completed')
          .reduce((sum, p: any) => sum + (p.amount || 0), 0);

        return {
          id: sale.id,
          total: sale.total,
          status: sale.status,
          session_id: sale.session_id,
          cashPayment: cashPayment,
        };
      });

      const totalCashSales = salesDetails.reduce((sum, sale) => sum + sale.cashPayment, 0);

      const cashPaymentsCount = allPayments.filter((p: any) =>
        sessionSales.some((s: any) => s.id === p.sale_id) &&
        p.method === 'cash' &&
        p.status === 'completed'
      ).length;

      const breakdown: CashBreakdown = {
        openingCash: currentSession.opening_cash,
        cashSales: totalCashSales,
        expectedTotal: currentSession.opening_cash + totalCashSales,
        salesDetails: salesDetails,
        debugInfo: {
          totalSalesInSession: sessionSales.length,
          totalPaymentsFound: allPayments.filter((p: any) =>
            sessionSales.some((s: any) => s.id === p.sale_id)
          ).length,
          cashPaymentsCount: cashPaymentsCount,
        },
      };

      console.log('=== CASH BREAKDOWN DEBUG ===');
      console.log('Current Session ID:', currentSession.id);
      console.log('All Sales:', allSales.length);
      console.log('Sales in Session:', sessionSales.length);
      console.log('Sales Details:', salesDetails);
      console.log('All Sales (checking for 190):', allSales.filter((s: any) => s.total === 190));

      setCashBreakdown(breakdown);
      setClosingCash(breakdown.expectedTotal.toFixed(2));
    } catch (error) {
      console.error('Error loading cash breakdown:', error);
      alert('Error al calcular el efectivo esperado');
    } finally {
      setLoadingBreakdown(false);
    }
  }

  async function handleOpenCloseModal() {
    setShowCloseModal(true);
    await loadCashBreakdown();
  }

  const difference = closingCash && cashBreakdown
    ? parseFloat(closingCash) - cashBreakdown.expectedTotal
    : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Control de Caja</h1>
        <p className="text-slate-600">Administrar sesiones de caja y operaciones del registro</p>
      </div>

      {currentSession ? (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Unlock className="w-6 h-6 text-green-600" />
                  <h2 className="text-xl font-bold text-green-900">Sesión Abierta</h2>
                </div>
                <p className="text-green-700 mb-4">
                  {currentSession.register?.name} - Abierta el{' '}
                  {new Date(currentSession.opened_at).toLocaleString()}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 font-medium">Efectivo Inicial:</span>
                    <span className="text-2xl font-bold text-green-900">
                      ${currentSession.opening_cash.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleOpenCloseModal}
                className="px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Actividad de Sesión</h3>
            <SessionActivity sessionId={currentSession.id} />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-6">
            <Lock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Sin Sesión Activa</h2>
            <p className="text-slate-600">
              Abra una sesión de caja para comenzar a procesar ventas
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <button
              onClick={() => setShowOpenModal(true)}
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Abrir Sesión de Caja</span>
            </button>
          </div>
        </div>
      )}

      {showOpenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Abrir Sesión de Caja</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Caja Registradora
                </label>
                <select
                  value={selectedRegister}
                  onChange={(e) => setSelectedRegister(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  {registers.map((register) => (
                    <option key={register.id} value={register.id}>
                      {register.name} {register.location && `- ${register.location}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Monto Inicial en Efectivo
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="number"
                    step="0.01"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notas (Opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  rows={3}
                  placeholder="Cualquier nota sobre esta sesión..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowOpenModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-900 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={openSession}
                disabled={loading || !openingCash}
                className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Abriendo...' : 'Abrir Sesión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseModal && currentSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Cerrar Sesión de Caja</h3>

            {loadingBreakdown ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
                  <p className="text-slate-600">Calculando efectivo esperado...</p>
                </div>
              </div>
            ) : cashBreakdown && (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Caja:</span>
                      <span className="font-medium">{currentSession.register?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Abierta:</span>
                      <span className="font-medium">
                        {new Date(currentSession.opened_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-xl p-6 mb-6">
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <span>Cálculo de Efectivo Esperado</span>
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b border-slate-200">
                      <div>
                        <span className="text-slate-700 font-medium">Efectivo Inicial</span>
                        <p className="text-xs text-slate-500">Monto con el que abrió la caja</p>
                      </div>
                      <span className="text-xl font-bold text-slate-900">
                        ${cashBreakdown.openingCash.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-slate-200">
                      <div>
                        <span className="text-slate-700 font-medium">+ Ventas en Efectivo</span>
                        <p className="text-xs text-slate-500">Ingresos por pagos en efectivo</p>
                      </div>
                      <span className="text-xl font-bold text-green-600">
                        +${cashBreakdown.cashSales.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-4 bg-gradient-to-r from-blue-100 to-slate-100 rounded-lg px-4 mt-2">
                      <div>
                        <span className="text-slate-900 font-bold text-lg">Total Esperado</span>
                        <p className="text-xs text-slate-600">Efectivo que debería haber en caja</p>
                      </div>
                      <span className="text-3xl font-bold text-blue-600">
                        ${cashBreakdown.expectedTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        <strong>Importante:</strong> Cuente cuidadosamente todo el efectivo físico en la caja antes de cerrar.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 mb-6">
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900">
                      Ver Detalles de Ventas ({cashBreakdown.debugInfo.totalSalesInSession} ventas)
                    </summary>
                    <div className="mt-3 space-y-2">
                      {cashBreakdown.salesDetails.length === 0 ? (
                        <p className="text-xs text-slate-600">No hay ventas en esta sesión</p>
                      ) : (
                        <>
                          {cashBreakdown.salesDetails.map((sale, idx) => (
                            <div
                              key={sale.id}
                              className="bg-white border border-slate-200 rounded p-2 text-xs"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-slate-900">Venta #{idx + 1}</p>
                                  <p className="text-slate-600">ID: {sale.id.substring(0, 8)}...</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-slate-900">Total: ${sale.total.toFixed(2)}</p>
                                  <p className="text-green-600 font-medium">
                                    Efectivo: ${sale.cashPayment.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="mt-3 pt-3 border-t border-slate-300">
                            <p className="text-xs text-slate-600">
                              Pagos en efectivo encontrados: {cashBreakdown.debugInfo.cashPaymentsCount}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </details>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Efectivo Real al Cierre
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="number"
                        step="0.01"
                        value={closingCash}
                        onChange={(e) => setClosingCash(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-lg font-semibold"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Ingrese la cantidad exacta de efectivo que cuenta físicamente
                    </p>
                  </div>

                  {closingCash && Math.abs(difference) > 0.01 && (
                    <div
                      className={`rounded-xl border-2 p-4 ${
                        difference > 0
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-red-50 border-red-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {difference > 0 ? (
                          <TrendingUp className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4
                              className={`font-bold text-lg ${
                                difference > 0 ? 'text-yellow-800' : 'text-red-800'
                              }`}
                            >
                              {difference > 0 ? 'Excedente Detectado' : 'Faltante Detectado'}
                            </h4>
                            <span
                              className={`text-2xl font-bold ${
                                difference > 0 ? 'text-yellow-700' : 'text-red-700'
                              }`}
                            >
                              {difference > 0 ? '+' : ''}${difference.toFixed(2)}
                            </span>
                          </div>

                          {difference > 0 ? (
                            <div className="space-y-2">
                              <p className="text-sm text-yellow-800 font-medium">
                                Hay más efectivo del esperado. Posibles causas:
                              </p>
                              <ul className="text-sm text-yellow-700 space-y-1 ml-4">
                                <li className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>Ventas en efectivo no registradas en el sistema</span>
                                </li>
                                <li className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>Error al contar el efectivo inicial</span>
                                </li>
                                <li className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>Devoluciones no procesadas correctamente</span>
                                </li>
                              </ul>
                              <p className="text-sm text-yellow-800 font-semibold mt-3">
                                ⚠️ Consecuencia: Se registrará un excedente que deberá ser explicado en auditoría.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-red-800 font-medium">
                                Falta efectivo en caja. Posibles causas:
                              </p>
                              <ul className="text-sm text-red-700 space-y-1 ml-4">
                                <li className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>Error en el conteo del efectivo físico</span>
                                </li>
                                <li className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>Pagos en efectivo registrados incorrectamente como efectivo</span>
                                </li>
                                <li className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>Retiros no autorizados o pérdida de efectivo</span>
                                </li>
                                <li className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>Cambio incorrecto entregado a clientes</span>
                                </li>
                              </ul>
                              <p className="text-sm text-red-800 font-semibold mt-3">
                                🚨 Consecuencia: Se registrará un faltante que puede resultar en responsabilidad del cajero y/o investigación interna.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {closingCash && Math.abs(difference) <= 0.01 && parseFloat(closingCash) > 0 && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-lg text-green-800 mb-1">
                            Efectivo Correcto
                          </h4>
                          <p className="text-sm text-green-700">
                            El monto ingresado coincide con el efectivo esperado. La caja está balanceada correctamente.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notas y Observaciones
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      rows={3}
                      placeholder={
                        Math.abs(difference) > 0.01
                          ? 'REQUERIDO: Explique la diferencia encontrada en el cierre de caja...'
                          : 'Cualquier nota sobre esta sesión (opcional)...'
                      }
                    />
                    {Math.abs(difference) > 0.01 && (
                      <p className="text-xs text-amber-700 mt-1 font-medium">
                        Se recomienda agregar una explicación de la diferencia para el registro.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCloseModal(false);
                      setClosingCash('');
                      setNotes('');
                      setCashBreakdown(null);
                    }}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-900 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={closeSession}
                    disabled={loading || !closingCash}
                    className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Cerrando...' : 'Cerrar Sesión'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionActivity({ sessionId }: { sessionId: string }) {
  const [stats, setStats] = useState({
    totalSales: 0,
    salesCount: 0,
    cashSales: 0,
    cardSales: 0,
    transferSales: 0,
  });

  useEffect(() => {
    loadStats();
  }, [sessionId]);

  async function loadStats() {
    const salesQuery = query(
      collection(db, 'sales'),
      where('session_id', '==', sessionId),
      where('status', '==', 'completed')
    );
    const salesSnapshot = await getDocs(salesQuery);

    if (salesSnapshot.empty) {
      return;
    }

    const sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const saleIds = sales.map(s => s.id);
    const totalSales = sales.reduce((sum, s: any) => sum + s.total, 0);

    const paymentsQuery = query(
      collection(db, 'payments'),
      where('sale_id', 'in', saleIds),
      where('status', '==', 'completed')
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);

    const payments = paymentsSnapshot.docs.map(doc => doc.data());
    const cashSales = payments.filter((p: any) => p.method === 'cash').reduce((sum, p: any) => sum + p.amount, 0);
    const cardSales = payments.filter((p: any) => p.method === 'card').reduce((sum, p: any) => sum + p.amount, 0);
    const transferSales = payments.filter((p: any) => p.method === 'transfer').reduce((sum, p: any) => sum + p.amount, 0);

    setStats({
      totalSales,
      salesCount: sales.length,
      cashSales,
      cardSales,
      transferSales,
    });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="bg-slate-50 rounded-lg p-4">
        <p className="text-sm text-slate-600 mb-1">Total Ventas</p>
        <p className="text-2xl font-bold text-slate-900">{stats.salesCount}</p>
      </div>
      <div className="bg-slate-50 rounded-lg p-4">
        <p className="text-sm text-slate-600 mb-1">Ingresos</p>
        <p className="text-2xl font-bold text-slate-900">${stats.totalSales.toFixed(2)}</p>
      </div>
      <div className="bg-slate-50 rounded-lg p-4">
        <p className="text-sm text-slate-600 mb-1">Efectivo</p>
        <p className="text-2xl font-bold text-green-600">${stats.cashSales.toFixed(2)}</p>
      </div>
      <div className="bg-slate-50 rounded-lg p-4">
        <p className="text-sm text-slate-600 mb-1">Tarjeta</p>
        <p className="text-2xl font-bold text-blue-600">${stats.cardSales.toFixed(2)}</p>
      </div>
      <div className="bg-slate-50 rounded-lg p-4">
        <p className="text-sm text-slate-600 mb-1">Transferencia</p>
        <p className="text-2xl font-bold text-slate-600">${stats.transferSales.toFixed(2)}</p>
      </div>
    </div>
  );
}
