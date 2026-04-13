import { getUser, getCycleDay, getPhaseForDay, PHASES, CYCLE_LENGTH, escapeHtml } from '../state.js';
import { navigate } from '../router.js';

const CX = 160;
const CY = 160;
const R = 120;
const STROKE = 28;

function polarToXY(angleDeg, radius) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
        x: CX + radius * Math.cos(rad),
        y: CY + radius * Math.sin(rad),
    };
}

function describeArc(startDeg, endDeg, r) {
    const start = polarToXY(startDeg, r);
    const end = polarToXY(endDeg, r);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function buildTimeline(cycleDay) {
    let svg = `<svg id="timeline-svg" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" aria-label="Cycle timeline">`;

    // Background ring
    svg += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#e8e8e8" stroke-width="${STROKE}" />`;

    // Phase arcs
    let angleCursor = 0;
    PHASES.forEach((phase, idx) => {
        const span = (phase.days / CYCLE_LENGTH) * 360;
        const startAngle = angleCursor;
        const endAngle = angleCursor + span;
        const midAngle = (startAngle + endAngle) / 2;
        const labelPos = polarToXY(midAngle, R);

        svg += `
            <path
                d="${describeArc(startAngle, endAngle, R)}"
                fill="none"
                stroke="${phase.color}"
                stroke-width="${STROKE}"
                stroke-linecap="butt"
                class="phase-arc"
                data-phase="${idx}"
                tabindex="0"
                role="button"
                aria-label="${phase.label} phase"
                style="cursor:pointer"
            />`;

        // Phase emoji label on the arc
        const emojiPos = polarToXY(midAngle, R);
        svg += `
            <text
                x="${emojiPos.x}"
                y="${emojiPos.y}"
                text-anchor="middle"
                dominant-baseline="central"
                font-size="13"
                style="pointer-events:none;user-select:none"
            >${phase.emoji}</text>`;

        angleCursor += span;
    });

    // User position marker
    const userAngle = ((cycleDay - 1) / CYCLE_LENGTH) * 360;
    const markerPos = polarToXY(userAngle, R);
    const user = getUser();
    const initial = escapeHtml((user?.name || '?')[0].toUpperCase());

    svg += `
        <circle
            cx="${markerPos.x}"
            cy="${markerPos.y}"
            r="16"
            fill="white"
            stroke="#333"
            stroke-width="2.5"
            class="user-marker"
        />
        <text
            x="${markerPos.x}"
            y="${markerPos.y}"
            text-anchor="middle"
            dominant-baseline="central"
            font-size="13"
            font-weight="700"
            fill="#333"
            style="pointer-events:none;user-select:none"
        >${initial}</text>`;

    // Centre text: cycle day
    svg += `
        <text x="${CX}" y="${CY - 10}" text-anchor="middle" class="svg-centre-label">Day</text>
        <text x="${CX}" y="${CY + 16}" text-anchor="middle" class="svg-centre-day">${cycleDay}</text>`;

    svg += `</svg>`;
    return svg;
}

export function renderHome(app) {
    const user = getUser();
    const cycleDay = getCycleDay(user.birthday);

    // Birthday invalid or future — send back to setup
    if (!cycleDay) {
        navigate('setup');
        return;
    }

    const { phase, dayInPhase } = getPhaseForDay(cycleDay);
    const safeName = escapeHtml(user.name);

    // Apply phase theme to root
    document.documentElement.style.setProperty('--phase-color', phase.color);
    document.documentElement.style.setProperty('--phase-color-light', phase.colorLight);

    app.innerHTML = `
        <div class="home-page" style="--phase-color:${phase.color};--phase-color-light:${phase.colorLight}">
            <header class="top-bar">
                <div class="top-bar-left">
                    <span class="greeting">Hi, ${safeName} ${phase.emoji}</span>
                </div>
                <button class="icon-btn" id="profile-btn" title="Profile" aria-label="Profile">
                    <span class="avatar">${escapeHtml(user.name[0].toUpperCase())}</span>
                </button>
            </header>

            <section class="phase-banner" style="background:${phase.colorLight};border-left:4px solid ${phase.color}">
                <div class="phase-banner-title" style="color:${phase.color}">${phase.label} Phase</div>
                <div class="phase-banner-sub">Day ${dayInPhase} of ${phase.days} · Cycle day ${cycleDay}</div>
                <div class="phase-banner-summary">${phase.summary}</div>
            </section>

            <section class="timeline-section">
                <h2 class="section-title">Your Cycle</h2>
                <div class="timeline-wrap">
                    ${buildTimeline(cycleDay)}
                </div>
                <div id="phase-tooltip" class="phase-tooltip hidden"></div>
            </section>

            <section id="phase-detail-panel" class="phase-detail-panel hidden"></section>

            <section class="self-care-section">
                <h2 class="section-title">Self-care for ${phase.label}</h2>
                <ul class="self-care-list">
                    ${phase.selfCare.map(tip => `<li class="self-care-item">
                        <span class="self-care-dot" style="background:${phase.color}"></span>
                        <span>${tip}</span>
                    </li>`).join('')}
                </ul>
            </section>

            <section class="phase-legend">
                <h2 class="section-title">All Phases</h2>
                <div class="legend-grid">
                    ${PHASES.map((p, idx) => `
                        <button class="legend-chip ${p.id === phase.id ? 'legend-chip--active' : ''}" data-phase="${idx}"
                                style="--chip-color:${p.color};--chip-light:${p.colorLight}">
                            <span class="legend-emoji">${p.emoji}</span>
                            <span class="legend-name">${p.label}</span>
                            <span class="legend-days">${p.days}d</span>
                        </button>
                    `).join('')}
                </div>
            </section>
        </div>
    `;

    // Profile button
    document.getElementById('profile-btn').addEventListener('click', () => navigate('profile'));

    // Phase arc interactions (hover tooltip, click expand)
    const svg = document.getElementById('timeline-svg');
    const tooltip = document.getElementById('phase-tooltip');
    const detailPanel = document.getElementById('phase-detail-panel');
    let expandedPhaseIdx = null;

    function showDetailPanel(idx, scroll = false) {
        const p = PHASES[idx];
        expandedPhaseIdx = idx;
        detailPanel.classList.remove('hidden');
        detailPanel.innerHTML = `
            <div class="detail-header" style="background:${p.colorLight};border-left:4px solid ${p.color}">
                <span class="detail-emoji">${p.emoji}</span>
                <div>
                    <div class="detail-name" style="color:${p.color}">${p.label} Phase</div>
                    <div class="detail-days">Days ${getDayRange(idx)} · ${p.days} days</div>
                </div>
                <button class="detail-close" aria-label="Close">✕</button>
            </div>
            <p class="detail-description">${p.details}</p>
            <ul class="self-care-list">
                ${p.selfCare.map(tip => `<li class="self-care-item">
                    <span class="self-care-dot" style="background:${p.color}"></span>
                    <span>${tip}</span>
                </li>`).join('')}
            </ul>
        `;
        detailPanel.querySelector('.detail-close').addEventListener('click', () => {
            expandedPhaseIdx = null;
            detailPanel.classList.add('hidden');
            detailPanel.innerHTML = '';
        });
        if (scroll) detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    svg.querySelectorAll('.phase-arc').forEach(arc => {
        const idx = parseInt(arc.dataset.phase, 10);
        const p = PHASES[idx];

        arc.addEventListener('mouseenter', () => {
            tooltip.innerHTML = `<strong style="color:${p.color}">${p.emoji} ${p.label}</strong><br>${p.summary}`;
            tooltip.classList.remove('hidden');
        });

        arc.addEventListener('mousemove', (e) => {
            const rect = app.getBoundingClientRect();
            tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
            tooltip.style.top = (e.clientY - rect.top - 40) + 'px';
        });

        arc.addEventListener('mouseleave', () => {
            tooltip.classList.add('hidden');
        });

        arc.addEventListener('click', () => {
            if (expandedPhaseIdx === idx) {
                expandedPhaseIdx = null;
                detailPanel.classList.add('hidden');
                detailPanel.innerHTML = '';
            } else {
                tooltip.classList.add('hidden');
                showDetailPanel(idx);
            }
        });

        arc.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                arc.dispatchEvent(new MouseEvent('click'));
            }
        });
    });

    // Legend chip click
    app.querySelectorAll('.legend-chip').forEach(chip => {
        const idx = parseInt(chip.dataset.phase, 10);
        chip.addEventListener('click', () => showDetailPanel(idx, true));
    });
}

function getDayRange(phaseIdx) {
    let start = 1;
    for (let i = 0; i < phaseIdx; i++) start += PHASES[i].days;
    return `${start}–${start + PHASES[phaseIdx].days - 1}`;
}
