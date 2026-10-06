'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, ImageIcon, Clock, CheckCircle, Loader2, XCircle, Trash2, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Document } from '@/types'

const STATUS_CONFIG = {
    uploaded: { label: 'Uploaded', icon: Clock, class: 'bg-blue-100 text-blue-700' },
    processing: { label: 'Processing', icon: Loader2, class: 'bg-yellow-100 text-yellow-700' },
    completed: { label: 'Completed', icon: CheckCircle, class: 'bg-emerald-100 text-emerald-700' },
    failed: { label: 'Failed', icon: XCircle, class: 'bg-red-100 text-red-700' },
}

interface DocumentCardProps {
    document: Document
    onDelete?: (id: string) => void
    onOpen?: (id: string) => void
}

export function DocumentCard({ document, onDelete, onOpen }: DocumentCardProps) {
    const config = STATUS_CONFIG[document.status]
    const StatusIcon = config.icon

    return (
        <Card className="p-4 hover:shadow-md transition-shadow duration-200 group">
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="p-2 rounded-lg bg-muted shrink-0">
                    {document.file_type === 'pdf' ? (
                        <FileText className="h-5 w-5 text-primary" />
                    ) : (
                        <ImageIcon className="h-5 w-5 text-primary" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" title={document.filename}>
                        {document.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs capitalize">
                            {document.language.toUpperCase()}
                        </Badge>
                        <Badge className={`text-xs ${config.class}`}>
                            <StatusIcon className={`mr-1 h-3 w-3 ${document.status === 'processing' ? 'animate-spin' : ''}`} />
                            {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {(document.file_size / 1024).toFixed(1)} KB
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {document.status === 'completed' && onOpen && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onOpen(document.id)}
                            title="Open"
                        >
                            <Play className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDelete(document.id)}
                            title="Delete"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    )
}
