import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';

export interface AreaConfig {
    x: number;      // percentage 0-100
    y: number;      // percentage 0-100
    width: number;  // percentage 0-100
    height: number; // percentage 0-100
}

interface AreaSelectorProps {
    frameImage: string;
    areaConfig: AreaConfig | null;
    onAreaChange: (area: AreaConfig | null) => void;
}

type DragMode = 'none' | 'draw' | 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br';

function AreaSelector({ frameImage, areaConfig, onAreaChange }: AreaSelectorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dragMode, setDragMode] = useState<DragMode>('none');
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [tempArea, setTempArea] = useState<AreaConfig | null>(null);
    const [originalArea, setOriginalArea] = useState<AreaConfig | null>(null);

    const getRelativePosition = useCallback((e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        return {
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
        };
    }, []);

    const getCornerAtPosition = useCallback((pos: { x: number; y: number }, area: AreaConfig): DragMode => {
        const handleSize = 3;
        const corners: { mode: DragMode; cx: number; cy: number }[] = [
            { mode: 'resize-tl', cx: area.x, cy: area.y },
            { mode: 'resize-tr', cx: area.x + area.width, cy: area.y },
            { mode: 'resize-bl', cx: area.x, cy: area.y + area.height },
            { mode: 'resize-br', cx: area.x + area.width, cy: area.y + area.height },
        ];

        for (const corner of corners) {
            if (Math.abs(pos.x - corner.cx) < handleSize && Math.abs(pos.y - corner.cy) < handleSize) {
                return corner.mode;
            }
        }

        if (
            pos.x >= area.x && pos.x <= area.x + area.width &&
            pos.y >= area.y && pos.y <= area.y + area.height
        ) {
            return 'move';
        }

        return 'draw';
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const pos = getRelativePosition(e);

        if (areaConfig) {
            const mode = getCornerAtPosition(pos, areaConfig);
            setDragMode(mode);
            setDragStart(pos);
            setOriginalArea({ ...areaConfig });

            if (mode === 'draw') {
                setTempArea({ x: pos.x, y: pos.y, width: 0, height: 0 });
            }
        } else {
            setDragMode('draw');
            setDragStart(pos);
            setTempArea({ x: pos.x, y: pos.y, width: 0, height: 0 });
        }
    }, [areaConfig, getRelativePosition, getCornerAtPosition]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (dragMode === 'none' || !dragStart) return;

        const pos = getRelativePosition(e);

        if (dragMode === 'draw') {
            const newArea: AreaConfig = {
                x: Math.min(dragStart.x, pos.x),
                y: Math.min(dragStart.y, pos.y),
                width: Math.abs(pos.x - dragStart.x),
                height: Math.abs(pos.y - dragStart.y),
            };
            setTempArea(newArea);
        } else if (dragMode === 'move' && originalArea) {
            const dx = pos.x - dragStart.x;
            const dy = pos.y - dragStart.y;
            let newX = originalArea.x + dx;
            let newY = originalArea.y + dy;
            newX = Math.max(0, Math.min(100 - originalArea.width, newX));
            newY = Math.max(0, Math.min(100 - originalArea.height, newY));

            setTempArea({
                x: newX,
                y: newY,
                width: originalArea.width,
                height: originalArea.height,
            });
        } else if (dragMode.startsWith('resize-') && originalArea) {
            let newX = originalArea.x;
            let newY = originalArea.y;
            let newW = originalArea.width;
            let newH = originalArea.height;

            const dx = pos.x - dragStart.x;
            const dy = pos.y - dragStart.y;

            if (dragMode === 'resize-tl') {
                newX = originalArea.x + dx;
                newY = originalArea.y + dy;
                newW = originalArea.width - dx;
                newH = originalArea.height - dy;
            } else if (dragMode === 'resize-tr') {
                newY = originalArea.y + dy;
                newW = originalArea.width + dx;
                newH = originalArea.height - dy;
            } else if (dragMode === 'resize-bl') {
                newX = originalArea.x + dx;
                newW = originalArea.width - dx;
                newH = originalArea.height + dy;
            } else if (dragMode === 'resize-br') {
                newW = originalArea.width + dx;
                newH = originalArea.height + dy;
            }

            if (newW < 2) newW = 2;
            if (newH < 2) newH = 2;
            newX = Math.max(0, Math.min(100 - newW, newX));
            newY = Math.max(0, Math.min(100 - newH, newY));

            setTempArea({ x: newX, y: newY, width: newW, height: newH });
        }
    }, [dragMode, dragStart, originalArea, getRelativePosition]);

    const handleMouseUp = useCallback(() => {
        if (dragMode !== 'none' && tempArea) {
            if (tempArea.width > 1 && tempArea.height > 1) {
                onAreaChange(tempArea);
            }
        }
        setDragMode('none');
        setDragStart(null);
        setTempArea(null);
        setOriginalArea(null);
    }, [dragMode, tempArea, onAreaChange]);

    useEffect(() => {
        if (dragMode !== 'none') {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragMode, handleMouseMove, handleMouseUp]);

    const activeArea = tempArea || areaConfig;

    const getCursorStyle = (): string => {
        if (dragMode === 'move') return 'grabbing';
        if (dragMode === 'draw') return 'crosshair';
        if (dragMode.startsWith('resize-')) return 'nwse-resize';
        return 'crosshair';
    };

    const handleReset = () => {
        onAreaChange(null);
        setTempArea(null);
    };

    return (
        <div>
            {/* Status & reset */}
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">
                    {!areaConfig
                        ? '🎯 Klik dan drag pada gambar untuk menandai area penempatan QRIS'
                        : '✅ Area ditandai. Drag untuk pindah, seret sudut untuk resize.'}
                </p>
                {areaConfig && (
                    <button
                        onClick={handleReset}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center gap-1.5"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                    </button>
                )}
            </div>

            {/* Area info */}
            {activeArea && activeArea.width > 0 && activeArea.height > 0 && (
                <div className="mb-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                            <span className="text-slate-400">X:</span>{' '}
                            <span className="font-mono font-medium text-slate-700">{activeArea.x.toFixed(1)}%</span>
                        </div>
                        <div>
                            <span className="text-slate-400">Y:</span>{' '}
                            <span className="font-mono font-medium text-slate-700">{activeArea.y.toFixed(1)}%</span>
                        </div>
                        <div>
                            <span className="text-slate-400">W:</span>{' '}
                            <span className="font-mono font-medium text-slate-700">{activeArea.width.toFixed(1)}%</span>
                        </div>
                        <div>
                            <span className="text-slate-400">H:</span>{' '}
                            <span className="font-mono font-medium text-slate-700">{activeArea.height.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Frame with draggable area overlay */}
            <div
                ref={containerRef}
                className="relative select-none rounded-lg overflow-hidden border-2 border-slate-200"
                style={{ cursor: getCursorStyle() }}
                onMouseDown={handleMouseDown}
            >
                <img
                    src={frameImage}
                    alt="Frame Template"
                    className="w-full block pointer-events-none"
                    draggable={false}
                />

                {/* Overlay & selection */}
                {activeArea && activeArea.width > 0 && activeArea.height > 0 && (
                    <>
                        <div
                            className="absolute inset-0 bg-black/40 pointer-events-none"
                            style={{
                                clipPath: `polygon(
                  0% 0%, 100% 0%, 100% 100%, 0% 100%,
                  0% ${activeArea.y}%,
                  ${activeArea.x}% ${activeArea.y}%,
                  ${activeArea.x}% ${activeArea.y + activeArea.height}%,
                  ${activeArea.x + activeArea.width}% ${activeArea.y + activeArea.height}%,
                  ${activeArea.x + activeArea.width}% ${activeArea.y}%,
                  0% ${activeArea.y}%
                )`,
                            }}
                        />

                        <div
                            className="absolute border-2 border-blue-500 pointer-events-none"
                            style={{
                                left: `${activeArea.x}%`,
                                top: `${activeArea.y}%`,
                                width: `${activeArea.width}%`,
                                height: `${activeArea.height}%`,
                                boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.5)',
                            }}
                        >
                            <div className="absolute inset-1 border border-dashed border-blue-300 pointer-events-none" />
                        </div>

                        {/* Corner handles */}
                        {['tl', 'tr', 'bl', 'br'].map((corner) => {
                            const isLeft = corner.includes('l');
                            const isTop = corner.includes('t');
                            return (
                                <div
                                    key={corner}
                                    className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm pointer-events-none"
                                    style={{
                                        left: `${isLeft ? activeArea.x : activeArea.x + activeArea.width}%`,
                                        top: `${isTop ? activeArea.y : activeArea.y + activeArea.height}%`,
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                />
                            );
                        })}

                        {/* Center crosshair */}
                        <div
                            className="absolute w-6 h-6 pointer-events-none flex items-center justify-center"
                            style={{
                                left: `${activeArea.x + activeArea.width / 2}%`,
                                top: `${activeArea.y + activeArea.height / 2}%`,
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            <div className="w-4 h-[2px] bg-blue-500/60 absolute" />
                            <div className="h-4 w-[2px] bg-blue-500/60 absolute" />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default AreaSelector;
