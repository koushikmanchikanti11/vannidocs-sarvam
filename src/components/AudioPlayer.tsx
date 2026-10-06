'use client'

import { useRef, useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Download, Volume2 } from 'lucide-react'

interface AudioPlayerProps {
    audioUrl: string
    label?: string
}

export function AudioPlayer({ audioUrl, label = 'Generated Audio' }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [speed, setSpeed] = useState(1)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const onTimeUpdate = () => setCurrentTime(audio.currentTime)
        const onDurationChange = () => setDuration(audio.duration)
        const onEnded = () => setIsPlaying(false)

        audio.addEventListener('timeupdate', onTimeUpdate)
        audio.addEventListener('durationchange', onDurationChange)
        audio.addEventListener('ended', onEnded)

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate)
            audio.removeEventListener('durationchange', onDurationChange)
            audio.removeEventListener('ended', onEnded)
        }
    }, [])

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio) return
        if (isPlaying) {
            audio.pause()
        } else {
            audio.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current
        if (!audio || !duration) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const ratio = x / rect.width
        audio.currentTime = ratio * duration
    }

    const cycleSpeed = () => {
        const speeds = [0.75, 1, 1.25, 1.5, 2]
        const index = speeds.indexOf(speed)
        const next = speeds[(index + 1) % speeds.length]
        setSpeed(next)
        if (audioRef.current) audioRef.current.playbackRate = next
    }

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60)
        const sec = Math.floor(s % 60)
        return `${m}:${sec.toString().padStart(2, '0')}`
    }

    return (
        <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{label}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                    {duration ? formatTime(duration) : '--:--'}
                </Badge>
            </div>

            {/* Progress Bar */}
            <div
                className="cursor-pointer group"
                onClick={handleProgressClick}
            >
                <Progress
                    value={duration ? (currentTime / duration) * 100 : 0}
                    className="h-2 group-hover:h-3 transition-all"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{duration ? formatTime(duration) : '--:--'}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
                <Button
                    onClick={togglePlay}
                    size="icon"
                    className="h-10 w-10 rounded-full"
                >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                <Button
                    onClick={cycleSpeed}
                    variant="outline"
                    size="sm"
                    className="min-w-[56px] font-mono text-xs"
                >
                    {speed}×
                </Button>

                <div className="flex-1" />

                <Button variant="outline" size="sm" asChild>
                    <a href={audioUrl} download="vaanidoc-audio.mp3">
                        <Download className="h-4 w-4 mr-1.5" />
                        Download
                    </a>
                </Button>
            </div>

            <audio ref={audioRef} src={audioUrl} preload="metadata" />
        </Card>
    )
}
