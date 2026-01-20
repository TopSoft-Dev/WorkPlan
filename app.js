// ============================================
// PLAN DZIAŁANIA - APP.JS
// ============================================

// Stan aplikacji
let actions = [];
let planDate = '';

// Elementy DOM
const modalOverlay = document.getElementById('modalOverlay');
const addActionBtn = document.getElementById('addActionBtn');
const printBtn = document.getElementById('printBtn');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');
const actionsContainer = document.getElementById('actionsContainer');
const emptyState = document.getElementById('emptyState');
const planDateInput = document.getElementById('planDateInput');

// Inputy formularza
const actionNameInput = document.getElementById('actionName');
const cycleCountInput = document.getElementById('cycleCount');
const totalCyclesInput = document.getElementById('totalCycles');
const hasWeightTrackingInput = document.getElementById('hasWeightTracking');

// ============================================
// INICJALIZACJA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    renderActions();
    setupEventListeners();
});

function setupEventListeners() {
    // Modal
    addActionBtn.addEventListener('click', openModal);
    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    modalConfirm.addEventListener('click', addAction);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Drukowanie
    printBtn.addEventListener('click', () => {
        window.print();
    });

    // Zamknięcie modala klawiszem Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });

    // Enter w polu nazwy dodaje akcję
    actionNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addAction();
        }
    });

    // Obsługa zmiany daty planu
    planDateInput.addEventListener('input', (e) => {
        planDate = e.target.value;
        saveToStorage();
    });

    // Inicjalizacja Drag & Drop dla kontenera
    setupDragAndDrop();
}

function setupDragAndDrop() {
    actionsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingItem = actionsContainer.querySelector('.dragging');
        if (!draggingItem) return;

        const siblings = [...actionsContainer.querySelectorAll('.action-card:not(.dragging)')];
        const nextSibling = siblings.find(sibling => {
            const box = sibling.getBoundingClientRect();
            // Sprawdzamy pozycję myszy względem środka karty (działa dla grid i flex)
            return e.clientX < box.left + box.width / 2 && e.clientY < box.top + box.height / 2 ||
                e.clientY < box.top + box.height / 2;
        });

        // W wersji grid trudniej o idealne wstawianie "pomiędzy" prostym insertBefore,
        // ale na potrzeby wydruku 3-kolumnowego to wystarczy do wizualnego przesunięcia.
        // Jednak lepszym podejściem będzie swap tablicy po 'drop' dla trwałości danych.
    });
}

// ============================================
// MODAL
// ============================================
function openModal() {
    modalOverlay.classList.add('active');
    actionNameInput.value = '';
    cycleCountInput.value = '3';
    totalCyclesInput.value = '8';
    hasWeightTrackingInput.checked = false;
    actionNameInput.focus();
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

// ============================================
// ZARZĄDZANIE DZIAŁANIAMI
// ============================================
function addAction() {
    const name = actionNameInput.value.trim();
    const cycleCount = parseInt(cycleCountInput.value) || 3;
    const totalCycles = parseInt(totalCyclesInput.value) || 8;
    const hasWeightTracking = hasWeightTrackingInput.checked;

    if (!name) {
        actionNameInput.focus();
        actionNameInput.style.borderColor = '#ef4444';
        setTimeout(() => {
            actionNameInput.style.borderColor = '';
        }, 2000);
        return;
    }

    const action = {
        id: Date.now(),
        name,
        cycleCount,
        totalCycles,
        hasWeightTracking,
        cycles: []
    };

    // Inicjalizuj cykle
    for (let i = 0; i < totalCycles; i++) {
        const cycle = {
            boxes: [],
            weight: ''
        };
        for (let j = 0; j < cycleCount; j++) {
            cycle.boxes.push({ state: 'empty' }); // 'empty', 'checked', 'crossed'
        }
        action.cycles.push(cycle);
    }

    actions.push(action);
    saveToStorage();
    renderActions();
    closeModal();
}

function deleteAction(actionId) {
    if (confirm('Czy na pewno chcesz usunąć to działanie?')) {
        actions = actions.filter(a => a.id !== actionId);
        saveToStorage();
        renderActions();
    }
}

function updateName(actionId, newName) {
    const action = actions.find(a => a.id === actionId);
    if (!action) return;
    action.name = newName.trim() || action.name;
    saveToStorage();
}

function toggleBox(actionId, cycleIndex, boxIndex) {
    // Funkcja wyłączona - kratki są tylko do druku i ręcznego skreślania
    return;
}

function updateWeight(actionId, cycleIndex, value) {
    const action = actions.find(a => a.id === actionId);
    if (!action) return;

    action.cycles[cycleIndex].weight = value;
    saveToStorage();
}

// ============================================
// RENDEROWANIE
// ============================================
function renderActions() {
    actionsContainer.innerHTML = '';

    if (actions.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    actions.forEach(action => {
        const card = createActionCard(action);
        actionsContainer.appendChild(card);
    });
}

function createActionCard(action) {
    const card = document.createElement('div');
    card.className = 'action-card';
    card.draggable = true;
    card.dataset.id = action.id;

    // Obsługa Drag Eventów na karcie
    card.addEventListener('dragstart', () => {
        setTimeout(() => card.classList.add('dragging'), 0);
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        // Po zakończeniu przeciągania aktualizujemy stan tablicy na podstawie nowej kolejności w DOM
        updateActionsOrder();
    });

    // Pozwalamy na dropowanie na karty
    card.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingItem = actionsContainer.querySelector('.dragging');
        if (draggingItem && draggingItem !== card) {
            const rect = card.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;
            if (e.clientX < midpoint) {
                actionsContainer.insertBefore(draggingItem, card);
            } else {
                actionsContainer.insertBefore(draggingItem, card.nextSibling);
            }
        }
    });

    card.innerHTML = `
        <div class="action-header">
            <div class="drag-handle no-print" title="Złap aby przesunąć">⠿</div>
            <h3 class="action-title" 
                contenteditable="true" 
                onblur="updateName(${action.id}, this.innerText)"
                title="Kliknij aby zmienić nazwę"
            >${escapeHtml(action.name)}</h3>
            <button class="action-delete no-print" onclick="deleteAction(${action.id})" title="Usuń działanie">
                🗑️
            </button>
        </div>
        <div class="action-body">
            <div class="cycles-container">
                ${action.cycles.map((cycle, cycleIdx) => createCycleRow(action, cycle, cycleIdx)).join('')}
            </div>
        </div>
    `;
    return card;
}

function updateActionsOrder() {
    const cardElements = [...actionsContainer.querySelectorAll('.action-card')];
    const newActionsOrder = cardElements.map(el => {
        const id = parseInt(el.dataset.id);
        return actions.find(a => a.id === id);
    }).filter(a => a !== undefined);

    actions = newActionsOrder;
    saveToStorage();
}

function createCycleRow(action, cycle, cycleIndex) {
    const boxesHtml = cycle.boxes.map((box, boxIdx) => `
        <div class="checkbox-box ${box.state}"></div>
    `).join('');

    const weightHtml = action.hasWeightTracking ? `
        <div class="weight-input-container">
            <input 
                type="text" 
                class="weight-input" 
                value="${escapeHtml(cycle.weight)}" 
                onchange="updateWeight(${action.id}, ${cycleIndex}, this.value)"
                title="Wpisz wagę (opcjonalne przed drukiem)"
            >
            <span class="weight-unit">kg</span>
        </div>
    ` : '';

    return `
        <div class="cycle-row">
            <span class="cycle-label">${cycleIndex + 1}.</span>
            <div class="cycle-boxes">
                ${boxesHtml}
            </div>
            ${weightHtml}
        </div>
    `;
}

// ============================================
// STORAGE
// ============================================
function saveToStorage() {
    try {
        localStorage.setItem('planDzialania_actions', JSON.stringify(actions));
        localStorage.setItem('planDzialania_date', planDate);
    } catch (e) {
        console.error('Błąd zapisu do localStorage:', e);
    }
}

function loadFromStorage() {
    try {
        const savedActions = localStorage.getItem('planDzialania_actions');
        if (savedActions) {
            actions = JSON.parse(savedActions);
        } else {
            addDefaultActions();
        }

        const savedDate = localStorage.getItem('planDzialania_date');
        if (savedDate) {
            planDate = savedDate;
            planDateInput.value = planDate;
        }
    } catch (e) {
        console.error('Błąd odczytu z localStorage:', e);
        actions = [];
    }
}

function addDefaultActions() {
    // Ćwiczenia - z wagą
    actions.push({
        id: Date.now(),
        name: 'Ćwiczenia',
        cycleCount: 3,
        totalCycles: 8,
        hasWeightTracking: true,
        cycles: Array.from({ length: 8 }, () => ({
            boxes: Array.from({ length: 3 }, () => ({ state: 'empty' })),
            weight: ''
        }))
    });

    // Posiłki do 18:00 - bez wagi
    actions.push({
        id: Date.now() + 1,
        name: 'Posiłki do 18:00',
        cycleCount: 3,
        totalCycles: 8,
        hasWeightTracking: false,
        cycles: Array.from({ length: 8 }, () => ({
            boxes: Array.from({ length: 3 }, () => ({ state: 'empty' })),
            weight: ''
        }))
    });

    saveToStorage();
}

// ============================================
// UTILITIES
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Eksportuj funkcje dla event handlerów w HTML
window.deleteAction = deleteAction;
window.toggleBox = toggleBox;
window.updateWeight = updateWeight;
window.updateName = updateName;
