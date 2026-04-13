import { useState, useRef } from 'react';
import { getUser, getCycleDay, getPhaseForDay, PHASES, CYCLE_LENGTH } from '../state.js';
import { navigate } from '../App.jsx';

// SVG constants
const CX = 160, CY = 160, R = 120, STROKE = 28;

function polarToXY(angleDeg, radius) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function describeArc(startDeg, endDeg, r) {
    const start = polarToXY(startDeg, r);
    const end = polarToXY(endDeg, r);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function getDayRange(phaseIdx) {
    let start = 1;
    for (let i = 0; i < phaseIdx; i++) start += PHASES[i].days;
    return `${start}–${start + PHASES[phaseIdx].days - 1}`;
}

function CycleTimeline({ cycleDay, onPhaseClick }) {
    const [tooltip, setTooltip] = useState(null); // { idx, x, y }
    const svgRef = useRef(null);

    let angleCursor = 0;
    const arcs = PHASES.map((phase, idx) => {
        const span = (phase.days / CYCLE_LENGTH) * 360;
        const startAngle = angleCursor;
        const endAngle = angleCursor + span;
        const midAngle = (startAngle + endAngle) / 2;
        const emojiPos = polarToXY(midAngle, R);
        angleCursor += span;
        return { phase, idx, startAngle, endAngle, emojiPos };
    });

    const userAngle = ((cycleDay - 1) / CYCLE_LENGTH) * 360;
    const markerPos = polarToXY(userAngle, R);
    const user = getUser();
    const initial = (user?.name || '?')[0].toUpperCase();

    return (
        <div className="relative flex justify-center">
            <svg
                ref={svgRef}
                viewBox="0 0 320 320"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Cycle timeline"
                className="w-full max-w-xs drop-shadow-lg"
            >
                {/* Background ring */}
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e8e8e8" strokeWidth={STROKE} />

                {/* Phase arcs */}
                {arcs.map(({ phase, idx, startAngle, endAngle, emojiPos }) => (
                    <g key={phase.id}>
                        <path
                            d={describeArc(startAngle, endAngle, R)}
                            fill="none"
                            stroke={phase.color}
                            strokeWidth={STROKE}
                            strokeLinecap="butt"
                            className="cursor-pointer transition-opacity hover:opacity-80 focus:opacity-80 focus:outline-none"
                            tabIndex={0}
                            role="button"
                            aria-label={`${phase.label} phase`}
                            onClick={() => onPhaseClick(idx)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPhaseClick(idx); } }}
                            onMouseEnter={e => {
                                const rect = svgRef.current?.parentElement?.getBoundingClientRect() || { left: 0, top: 0 };
                                setTooltip({ idx, x: e.clientX - rect.left, y: e.clientY - rect.top });
                            }}
                            onMouseMove={e => {
                                const rect = svgRef.current?.parentElement?.getBoundingClientRect() || { left: 0, top: 0 };
                                setTooltip(t => t ? { ...t, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
                            }}
                            onMouseLeave={() => setTooltip(null)}
                        />
                        <text
                            x={emojiPos.x}
                            y={emojiPos.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="13"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >{phase.emoji}</text>
                    </g>
                ))}

                {/* User marker */}
                <circle
                    cx={markerPos.x}
                    cy={markerPos.y}
                    r={16}
                    fill="white"
                    stroke="#333"
                    strokeWidth={2.5}
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.20))' }}
                />
                <text
                    x={markerPos.x}
                    y={markerPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="13"
                    fontWeight="700"
                    fill="#333"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >{initial}</text>

                {/* Centre text */}
                <text x={CX} y={CY - 10} textAnchor="middle" fontSize="12" fill="#6b7280" fontFamily="'DM Sans', sans-serif">Day</text>
                <text x={CX} y={CY + 16} textAnchor="middle" fontSize="32" fill="#1a1a1a" fontFamily="'DM Serif Display', serif">{cycleDay}</text>
            </svg>

            {/* Tooltip */}
            {tooltip && (() => {
                const p = PHASES[tooltip.idx];
                return (
                    <div
                        className="absolute z-20 bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-sm max-w-48 pointer-events-none"
                        style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
                    >
                        <strong style={{ color: p.color }}>{p.emoji} {p.label}</strong>
                        <br />
                        <span className="text-gray-500">{p.summary}</span>
                    </div>
                );
            })()}
        </div>
    );
}

function PhaseDetailPanel({ phaseIdx, onClose }) {
    const p = PHASES[phaseIdx];
    return (
        <div className="mx-4 mt-4 bg-white rounded-2xl shadow overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-l-4" style={{ background: p.colorLight, borderColor: p.color }}>
                <span className="text-3xl">{p.emoji}</span>
                <div className="flex-1">
                    <div className="font-bold text-base" style={{ color: p.color }}>{p.label} Phase</div>
                    <div className="text-xs text-gray-500">Days {getDayRange(phaseIdx)} · {p.days} days</div>
                </div>
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="text-gray-400 hover:text-gray-600 text-lg px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                >✕</button>
            </div>
            <p className="px-5 pt-4 pb-2 text-sm text-gray-700 leading-relaxed">{p.details}</p>
            <ul className="px-5 pb-5 flex flex-col gap-2 mt-1">
                {p.selfCare.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                        <span className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: p.color }} />
                        {tip}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function Home() {
    const user = getUser();
    const cycleDay = getCycleDay(user?.birthday);

    const [expandedPhaseIdx, setExpandedPhaseIdx] = useState(null);

    if (!cycleDay) {
        navigate('setup');
        return null;
    }

    const { phase, dayInPhase } = getPhaseForDay(cycleDay);
    const initial = (user?.name || '?')[0].toUpperCase();

    function handlePhaseClick(idx) {
        setExpandedPhaseIdx(prev => prev === idx ? null : idx);
    }

    return (
        <div className="min-h-dvh" style={{ '--phase-color': phase.color, '--phase-color-light': phase.colorLight }}>
            {/* Top bar */}
            <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-white border-b border-gray-100 shadow-sm max-w-lg mx-auto">
                <span className="text-base font-semibold text-gray-800">
                    Hi, {user.name} {phase.emoji}
                </span>
                <button
                    onClick={() => navigate('profile')}
                    title="Profile"
                    aria-label="Profile"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                    style={{ background: phase.color }}
                >
                    {initial}
                </button>
            </header>

            <div className="max-w-lg mx-auto pb-10">
                {/* Phase banner */}
                <div
                    className="mx-4 mt-4 px-5 py-4 rounded-2xl border-l-4"
                    style={{ background: phase.colorLight, borderColor: phase.color }}
                >
                    <div className="font-bold text-lg mb-0.5" style={{ color: phase.color }}>{phase.label} Phase</div>
                    <div className="text-xs text-gray-500 mb-2">Day {dayInPhase} of {phase.days} · Cycle day {cycleDay}</div>
                    <div className="text-sm text-gray-700 leading-relaxed">{phase.summary}</div>
                </div>

                {/* Timeline */}
                <section className="mt-6">
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider px-4 mb-3">Your Cycle</h2>
                    <div className="px-4">
                        <CycleTimeline cycleDay={cycleDay} onPhaseClick={handlePhaseClick} />
                    </div>
                </section>

                {/* Phase detail panel */}
                {expandedPhaseIdx !== null && (
                    <PhaseDetailPanel
                        phaseIdx={expandedPhaseIdx}
                        onClose={() => setExpandedPhaseIdx(null)}
                    />
                )}

                {/* Self-care tips */}
                <section className="mt-6">
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider px-4 mb-3">Self-care for {phase.label}</h2>
                    <ul className="px-4 flex flex-col gap-2.5">
                        {phase.selfCare.map((tip, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-gray-700 bg-white rounded-xl px-4 py-3 shadow-sm">
                                <span className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: phase.color }} />
                                {tip}
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Phase legend */}
                <section className="mt-6">
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider px-4 mb-3">All Phases</h2>
                    <div className="grid grid-cols-2 gap-2.5 px-4">
                        {PHASES.map((p, idx) => (
                            <button
                                key={p.id}
                                onClick={() => handlePhaseClick(idx)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left font-sans transition-all border-2 ${expandedPhaseIdx === idx || p.id === phase.id ? 'border-current shadow-sm' : 'border-transparent'}`}
                                style={{ background: p.colorLight, color: p.color }}
                            >
                                <span className="text-base">{p.emoji}</span>
                                <span className="text-sm font-semibold flex-1 text-gray-800">{p.label}</span>
                                <span className="text-xs text-gray-400">{p.days}d</span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
