import { useEffect, useState } from 'react';
import type { Notification } from '../types';
import { ShoppingBag, Bell, RefreshCw, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
    apiUrl: string;
}

export default function NotificationList({ apiUrl }: Props) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${apiUrl}/api/notifications`);
            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            setNotifications(data);
        } catch (err) {
            setError('通知の取得に失敗しました。URLを確認してください。');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Auto refresh every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [apiUrl]);

    const getIcon = (project: string) => {
        switch (project.toLowerCase()) {
            case 'shopee': return <ShoppingBag className="w-5 h-5 text-orange-500" />;
            default: return <Bell className="w-5 h-5 text-gray-500" />;
        }
    };

    if (loading && notifications.length === 0) {
        return (
            <div className="flex justify-center p-8">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error && notifications.length === 0) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
                <button onClick={fetchNotifications} className="ml-auto underline">
                    再試行
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-20">
            {notifications.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                    通知はありません
                </div>
            ) : (
                notifications.map((n) => (
                    <div key={n.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-3">
                        <div className="shrink-0 pt-1">
                            {getIcon(n.project)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-gray-900">{n.project}</h3>
                                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ja })}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words line-clamp-3">
                                {n.content}
                            </p>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
