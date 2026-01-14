import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUserRole } from '../hooks/useUserRole';
import { Conversation } from '../types/database';
import { Shield, Users, MessageCircle, Search, ChevronDown, ChevronUp } from 'lucide-react';

export default function ChatAudit() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isAdmin) {
      loadAllConversations();
    }
  }, [isAdmin]);

  async function loadAllConversations() {
    try {
      const snapshot = await getDocs(collection(db, 'conversations'));
      const convos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Conversation[];

      convos.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setConversations(convos);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleConversation(conversationId: string) {
    const newExpanded = new Set(expandedConversations);
    if (newExpanded.has(conversationId)) {
      newExpanded.delete(conversationId);
    } else {
      newExpanded.add(conversationId);
    }
    setExpandedConversations(newExpanded);
  }

  const filteredConversations = conversations.filter(conversation => {
    const term = searchTerm.toLowerCase();
    return (
      conversation.conversation_id.toLowerCase().includes(term) ||
      conversation.store_names.some(name => name.toLowerCase().includes(term)) ||
      conversation.messages.some(
        msg =>
          msg.message.toLowerCase().includes(term) ||
          msg.sender_user_name.toLowerCase().includes(term)
      )
    );
  });

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 text-slate-400 animate-pulse" />
          <p className="text-slate-600">Cargando auditoría de chats...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <Shield className="w-12 h-12 mx-auto mb-3 text-red-400" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Acceso Denegado</h3>
        <p className="text-red-700">Solo los administradores pueden acceder a la auditoría de chats</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Auditoría de Chats</h1>
          <p className="text-slate-600 mt-1">Supervisión de todas las conversaciones del sistema</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <Shield className="w-5 h-5" />
          <span>Modo Administrador</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por ID de conversación, tienda, usuario o mensaje..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Total Conversaciones</p>
              <p className="text-2xl font-bold text-blue-900">{conversations.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Chats Privados</p>
              <p className="text-2xl font-bold text-green-900">
                {conversations.filter(c => c.type === 'private').length}
              </p>
            </div>
            <MessageCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">Total Mensajes</p>
              <p className="text-2xl font-bold text-purple-900">
                {conversations.reduce((sum, c) => sum + c.messages.length, 0)}
              </p>
            </div>
            <MessageCircle className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredConversations.map(conversation => {
          const isExpanded = expandedConversations.has(conversation.id);
          return (
            <div
              key={conversation.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div
                className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleConversation(conversation.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        conversation.type === 'public' ? 'bg-blue-100' : 'bg-green-100'
                      }`}
                    >
                      {conversation.type === 'public' ? (
                        <Users className="w-6 h-6 text-blue-600" />
                      ) : (
                        <MessageCircle className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900">
                        {conversation.type === 'public' ? 'Sala Pública' : 'Chat Privado'}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-slate-600">
                        <span>ID: {conversation.conversation_id}</span>
                        {conversation.type === 'private' && (
                          <span>Tiendas: {conversation.store_names.join(' - ')}</span>
                        )}
                        <span>{conversation.messages.length} mensajes</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-6 h-6 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-200 p-6 bg-slate-50">
                  <h4 className="font-semibold text-slate-900 mb-4">Historial de Mensajes</h4>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {conversation.messages.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">Sin mensajes</p>
                    ) : (
                      conversation.messages.map(msg => (
                        <div
                          key={msg.id}
                          className="bg-white rounded-lg p-4 border border-slate-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span className="font-semibold text-slate-900">
                                {msg.sender_user_name}
                              </span>
                              <span className="text-sm text-slate-600 ml-2">
                                ({msg.sender_store_name})
                              </span>
                            </div>
                            <span className="text-xs text-slate-400">
                              {new Date(msg.created_at).toLocaleString('es-ES')}
                            </span>
                          </div>
                          {msg.image && (
                            <img
                              src={msg.image}
                              alt="Imagen compartida"
                              className="max-w-xs rounded-lg mb-2"
                            />
                          )}
                          {msg.message && (
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                              {msg.message}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredConversations.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No se encontraron conversaciones
            </h3>
            <p className="text-slate-600">
              {searchTerm ? 'Intenta con otros términos de búsqueda' : 'No hay conversaciones en el sistema'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
