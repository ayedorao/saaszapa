import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Conversation, ChatMessage, Store } from '../types/database';
import { Send, Image as ImageIcon, Users, MessageCircle, X, Loader } from 'lucide-react';

export default function Chat() {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (currentStore) {
      loadConversations();
    }
  }, [currentStore]);

  useEffect(() => {
    if (activeConversation) {
      const unsubscribe = onSnapshot(
        doc(db, 'conversations', activeConversation.id),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as Conversation;
            setActiveConversation({ id: snapshot.id, ...data });
            scrollToBottom();
          }
        }
      );
      return () => unsubscribe();
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function loadStores() {
    try {
      const snapshot = await getDocs(query(collection(db, 'stores'), where('active', '==', true)));
      const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Store[];
      setStores(storesData);

      const usersSnapshot = await getDocs(query(collection(db, 'user_roles'), where('user_id', '==', user?.uid)));
      if (usersSnapshot.empty) {
        setCurrentStore(storesData[0] || null);
      } else {
        setCurrentStore(storesData[0] || null);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadConversations() {
    if (!currentStore) return;

    try {
      const conversationsSnap = await getDocs(collection(db, 'conversations'));
      const convos: Conversation[] = [];

      conversationsSnap.docs.forEach(doc => {
        const data = doc.data() as Conversation;
        if (data.type === 'public' || data.store_ids.includes(currentStore.storeId)) {
          convos.push({ id: doc.id, ...data });
        }
      });

      convos.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setConversations(convos);

      const publicRoom = convos.find(c => c.type === 'public');
      if (publicRoom) {
        setActiveConversation(publicRoom);
      } else {
        await createPublicRoom();
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }

  async function createPublicRoom() {
    try {
      const publicRoomData: Omit<Conversation, 'id'> = {
        conversation_id: 'publicroom',
        type: 'public',
        store_ids: [],
        store_names: [],
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'conversations'), publicRoomData);
      const newRoom: Conversation = { id: docRef.id, ...publicRoomData };
      setConversations(prev => [newRoom, ...prev]);
      setActiveConversation(newRoom);
    } catch (error) {
      console.error('Error creating public room:', error);
    }
  }

  async function createPrivateChat(targetStore: Store) {
    if (!currentStore) return;

    const existingChat = conversations.find(
      c => c.type === 'private' &&
      c.store_ids.includes(currentStore.storeId) &&
      c.store_ids.includes(targetStore.storeId)
    );

    if (existingChat) {
      setActiveConversation(existingChat);
      setShowNewChatModal(false);
      return;
    }

    try {
      const conversationId = `private-${[currentStore.storeId, targetStore.storeId].sort().join('-')}`;
      const chatData: Omit<Conversation, 'id'> = {
        conversation_id: conversationId,
        type: 'private',
        store_ids: [currentStore.storeId, targetStore.storeId],
        store_names: [currentStore.name, targetStore.name],
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'conversations'), chatData);
      const newChat: Conversation = { id: docRef.id, ...chatData };
      setConversations(prev => [newChat, ...prev]);
      setActiveConversation(newChat);
      setShowNewChatModal(false);
    } catch (error) {
      console.error('Error creating private chat:', error);
      alert('Error al crear el chat');
    }
  }

  async function handleSendMessage() {
    if (!message.trim() && !selectedImage) return;
    if (!activeConversation || !currentStore || !user) return;

    if (selectedImage && selectedImage.length > 1048576) {
      alert('La imagen es demasiado grande. El límite es 1MB.');
      return;
    }

    setSending(true);
    try {
      const userDoc = await getDoc(doc(db, 'profiles', user.uid));
      const userData = userDoc.data();

      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: message.trim(),
        image: selectedImage || undefined,
        sender_store_id: currentStore.storeId,
        sender_store_name: currentStore.name,
        sender_user_id: user.uid,
        sender_user_name: userData?.full_name || user.email || 'Usuario',
        created_at: new Date().toISOString(),
      };

      const updatedMessages = [...(activeConversation.messages || []), newMessage];

      await updateDoc(doc(db, 'conversations', activeConversation.id), {
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      });

      setMessage('');
      setSelectedImage(null);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1048576) {
      alert('La imagen es demasiado grande. El tamaño máximo es 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function getConversationName(conversation: Conversation): string {
    if (conversation.type === 'public') {
      return 'Sala Pública';
    }

    const otherStoreName = conversation.store_names.find(
      name => name !== currentStore?.name
    );
    return otherStoreName || 'Chat Privado';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Mensajes</h2>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            <MessageCircle className="w-4 h-4 inline-block mr-2" />
            Nuevo Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(conversation => (
            <div
              key={conversation.id}
              onClick={() => setActiveConversation(conversation)}
              className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                activeConversation?.id === conversation.id ? 'bg-slate-100' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  conversation.type === 'public' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {conversation.type === 'public' ? (
                    <Users className="w-5 h-5 text-blue-600" />
                  ) : (
                    <MessageCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {getConversationName(conversation)}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {conversation.messages.length > 0
                      ? conversation.messages[conversation.messages.length - 1].message || 'Imagen'
                      : 'Sin mensajes'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-slate-50">
        {activeConversation ? (
          <>
            <div className="bg-white p-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activeConversation.type === 'public' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {activeConversation.type === 'public' ? (
                    <Users className="w-5 h-5 text-blue-600" />
                  ) : (
                    <MessageCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{getConversationName(activeConversation)}</h3>
                  <p className="text-sm text-slate-600">
                    {activeConversation.type === 'public'
                      ? 'Conversación visible para todas las tiendas'
                      : `Chat privado con ${getConversationName(activeConversation)}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeConversation.messages.map(msg => {
                const isOwnMessage = msg.sender_store_id === currentStore?.storeId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-lg ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium text-slate-600">
                          {msg.sender_user_name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {msg.sender_store_name}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-900 border border-slate-200'
                        }`}
                      >
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="Imagen compartida"
                            className="max-w-xs rounded-lg mb-2"
                          />
                        )}
                        {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                      </div>
                      <span className="text-xs text-slate-400 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white p-4 border-t border-slate-200">
              {selectedImage && (
                <div className="mb-3 relative inline-block">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="max-h-32 rounded-lg border border-slate-200"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Adjuntar imagen"
                >
                  <ImageIcon className="w-5 h-5 text-slate-600" />
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || (!message.trim() && !selectedImage)}
                  className="px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-slate-500">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>Selecciona una conversación para comenzar</p>
            </div>
          </div>
        )}
      </div>

      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Nuevo Chat Privado</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stores
                .filter(store => store.storeId !== currentStore?.storeId)
                .map(store => (
                  <button
                    key={store.id}
                    onClick={() => createPrivateChat(store)}
                    className="w-full p-4 text-left border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <p className="font-semibold text-slate-900">{store.name}</p>
                    <p className="text-sm text-slate-600">{store.address || 'Sin dirección'}</p>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
