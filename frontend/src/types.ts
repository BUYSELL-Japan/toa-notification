export interface Notification {
    id: number;
    project: string;
    content: string;
    raw_payload: string;
    is_read: number;
    created_at: string;
}

export type ProjectFilter = 'All' | 'Shopee' | 'Amazon' | 'Other';
