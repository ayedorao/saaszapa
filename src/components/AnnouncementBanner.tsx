import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Info, AlertTriangle, AlertOctagon, Bell, X, Calendar } from 'lucide-react';

interface Announcement {
  id: string;
  type: 'info' | 'minor' | 'critical' | 'update';
  title: string;
  message: string;
  active: boolean;
  start_date?: string;
  resolution_date?: string;
  created_at: string;
  created_by: string;
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
    setDismissedIds(dismissed);

    const q = query(collection(db, 'announces'), where('active', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(data);
    }, (error) => {
      console.error('Error loading announcements:', error);
    });

    return () => unsubscribe();
  }, []);

  function handleDismiss(announcement: Announcement) {
    if (announcement.type === 'info' || announcement.type === 'update') {
      const newDismissed = [...dismissedIds, announcement.id];
      setDismissedIds(newDismissed);
      localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
    }
  }

  function getIcon(type: string) {
    switch (type) {
      case 'info':
        return <Info className="w-5 h-5 flex-shrink-0" />;
      case 'minor':
        return <AlertTriangle className="w-5 h-5 flex-shrink-0" />;
      case 'critical':
        return <AlertOctagon className="w-5 h-5 flex-shrink-0" />;
      case 'update':
        return <Bell className="w-5 h-5 flex-shrink-0" />;
      default:
        return <Info className="w-5 h-5 flex-shrink-0" />;
    }
  }

  function getColors(type: string) {
    switch (type) {
      case 'info':
        return 'bg-blue-600 text-white border-blue-700';
      case 'minor':
        return 'bg-yellow-500 text-slate-900 border-yellow-600';
      case 'critical':
        return 'bg-red-600 text-white border-red-700';
      case 'update':
        return 'bg-green-600 text-white border-green-700';
      default:
        return 'bg-slate-600 text-white border-slate-700';
    }
  }

  const visibleAnnouncements = announcements.filter(
    announcement => !dismissedIds.includes(announcement.id)
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {visibleAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={`${getColors(announcement.type)} border-b px-6 py-3`}
        >
          <div className="max-w-7xl mx-auto flex items-start justify-between space-x-4">
            <div className="flex items-start space-x-3 flex-1">
              <div className="mt-0.5">
                {getIcon(announcement.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm md:text-base">
                  {announcement.title}
                </h3>
                <p className="text-sm opacity-90 mt-1">
                  {announcement.message}
                </p>
                {(announcement.start_date || announcement.resolution_date) && (
                  <div className="flex flex-wrap gap-4 mt-2 text-xs opacity-80">
                    {announcement.start_date && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Inicio: {new Date(announcement.start_date).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    )}
                    {announcement.resolution_date && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Resolución estimada: {new Date(announcement.resolution_date).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {(announcement.type === 'info' || announcement.type === 'update') && (
              <button
                onClick={() => handleDismiss(announcement)}
                className="p-1 hover:bg-black hover:bg-opacity-20 rounded transition-colors flex-shrink-0"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
