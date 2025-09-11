// apps/frontend/src/components/NotificationBell.tsx
'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import apiClient from '../api/axios';
import Link from 'next/link';

interface Notification {
    task_id: number;
    task_title: string;
    subject_name: string;
    due_date: string;
    subject_id: number;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await apiClient.get('/notifications/');
                setNotifications(response.data);
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            }
        };
        fetchNotifications();
    }, []);

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="relative p-2 rounded-full hover:bg-muted"
            >
                <Bell className="h-5 w-5 text-foreground" />
                {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
                    <div className="p-4 font-semibold border-b border-border">
                        Tasks Due Tomorrow
                    </div>
                    <div className="p-2 max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map(notif => (
                                <Link key={notif.task_id} href={`/subjects/${notif.subject_id}`}> {/* This needs subject_id */}
                                    <div className="p-2 hover:bg-muted rounded-md cursor-pointer">
                                        <p className="font-bold">{notif.task_title}</p>
                                        <p className="text-sm text-muted-foreground">{notif.subject_name}</p>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <p className="p-4 text-center text-muted-foreground">No tasks due tomorrow!</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}