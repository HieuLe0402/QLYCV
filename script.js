/**
 * Quản Lý Công Việc - Application Logic
 * Adheres strictly to requirements for adding, rendering, toggling, editing, deleting and footer updates.
 */

(function () {
    'use strict';

    // ==========================================
    // State Management
    // ==========================================
    const STORAGE_KEY = 'QLYCV_TASKS_DATA';

    let tasks = loadTasks();
    let editingTaskId = null;
    let pendingDeleteTaskId = null;

    // ==========================================
    // DOM Element References
    // ==========================================
    const taskInput = document.getElementById('task-input');
    const addBtn = document.getElementById('add-btn');
    const inputError = document.getElementById('input-error');
    const taskList = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    const footerCounter = document.getElementById('footer-counter');
    const allDoneBadge = document.getElementById('all-done-badge');

    // Delete Modal elements
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    // Toast element
    const toast = document.getElementById('toast');

    // ==========================================
    // Persistence
    // ==========================================
    function loadTasks() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error('Không thể tải dữ liệu từ localStorage', e);
        }
        return [];
    }

    function saveTasks() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        } catch (e) {
            console.error('Không thể lưu dữ liệu vào localStorage', e);
        }
    }

    // ==========================================
    // Utilities
    // ==========================================
    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 2200);
    }

    function showError(message) {
        if (!inputError) return;
        inputError.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${escapeHtml(message)}</span>`;
        inputError.classList.add('visible');
        taskInput.classList.add('input-invalid');
    }

    function clearError() {
        if (!inputError) return;
        inputError.textContent = '';
        inputError.classList.remove('visible');
        taskInput.classList.remove('input-invalid');
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ==========================================
    // Chức năng 1: Thêm công việc mới
    // ==========================================
    function handleAddTask() {
        const rawValue = taskInput.value;
        const trimmedTitle = rawValue.trim();

        // Validate: Không cho phép thêm công việc rỗng
        if (!trimmedTitle) {
            showError('Vui lòng nhập tên công việc!');
            taskInput.focus();
            return;
        }

        clearError();

        // Tạo công việc mới
        const newTask = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            title: trimmedTitle,
            completed: false,
            createdAt: Date.now()
        };

        tasks.unshift(newTask);
        saveTasks();

        // Xóa nội dung trong ô input & tự động focus
        taskInput.value = '';
        taskInput.focus();

        // Cập nhật danh sách công việc & footer
        render();
        showToast('Đã thêm công việc mới thành công!');
    }

    // ==========================================
    // Chức năng 3: Đánh dấu hoàn thành
    // ==========================================
    function toggleComplete(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        task.completed = !task.completed;
        saveTasks();
        render();

        if (task.completed) {
            showToast('Đã đánh dấu hoàn thành!');
        }
    }

    // ==========================================
    // Chức năng 4: Sửa công việc
    // ==========================================
    function startEdit(id) {
        editingTaskId = id;
        render();

        // Tự động focus vào ô input sửa
        setTimeout(() => {
            const editInput = document.getElementById(`edit-input-${id}`);
            if (editInput) {
                editInput.focus();
                const length = editInput.value.length;
                editInput.setSelectionRange(length, length);
            }
        }, 50);
    }

    function cancelEdit() {
        editingTaskId = null;
        render();
    }

    function saveEdit(id) {
        const editInput = document.getElementById(`edit-input-${id}`);
        if (!editInput) return;

        const updatedTitle = editInput.value.trim();

        // Validate: Không cho phép lưu nội dung rỗng
        if (!updatedTitle) {
            editInput.classList.add('input-invalid');
            showToast('Tên công việc không được để trống!');
            editInput.focus();
            return;
        }

        const task = tasks.find(t => t.id === id);
        if (task) {
            task.title = updatedTitle;
            saveTasks();
            showToast('Đã cập nhật công việc!');
        }

        editingTaskId = null;
        render();
    }

    // ==========================================
    // Chức năng 5: Xóa công việc
    // ==========================================
    function promptDelete(id) {
        pendingDeleteTaskId = id;
        const task = tasks.find(t => t.id === id);
        const descEl = document.getElementById('modal-desc');
        if (descEl && task) {
            descEl.innerHTML = `Bạn có chắc chắn muốn xóa công việc <strong>"${escapeHtml(task.title)}"</strong> không? Thao tác này không thể hoàn tác.`;
        }
        deleteModal.classList.remove('hidden');
    }

    function closeDeleteModal() {
        pendingDeleteTaskId = null;
        deleteModal.classList.add('hidden');
    }

    function confirmDelete() {
        if (!pendingDeleteTaskId) return;

        tasks = tasks.filter(t => t.id !== pendingDeleteTaskId);
        saveTasks();

        if (editingTaskId === pendingDeleteTaskId) {
            editingTaskId = null;
        }

        closeDeleteModal();
        render();
        showToast('Đã xóa công việc thành công!');
    }

    // ==========================================
    // Chức năng 6: Cập nhật Footer
    // ==========================================
    function updateFooter() {
        const total = tasks.length;
        const completedCount = tasks.filter(t => t.completed).length;

        // Cập nhật số đếm: 0/0 công việc hoàn thành
        footerCounter.textContent = `${completedCount}/${total} công việc hoàn thành`;

        // Khi tất cả công việc đã hoàn thành:
        // Hiển thị badge "Hoàn thành tất cả" với icon check màu xanh và animation
        if (total > 0 && completedCount === total) {
            allDoneBadge.classList.remove('hidden');
        } else {
            allDoneBadge.classList.add('hidden');
        }
    }

    // ==========================================
    // Chức năng 2: Hiển thị danh sách công việc
    // ==========================================
    function render() {
        // Cập nhật Footer
        updateFooter();

        // Kiểm tra danh sách rỗng
        if (tasks.length === 0) {
            emptyState.classList.remove('hidden');
            taskList.innerHTML = '';
            return;
        }

        emptyState.classList.add('hidden');
        taskList.innerHTML = '';

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''} ${editingTaskId === task.id ? 'is-editing' : ''}`;
            li.dataset.id = task.id;

            if (editingTaskId === task.id) {
                // Chế độ chỉnh sửa (Edit Mode)
                li.innerHTML = `
                    <div class="task-edit-form">
                        <input 
                            type="text" 
                            id="edit-input-${task.id}" 
                            class="task-edit-input" 
                            value="${escapeHtml(task.title)}"
                            aria-label="Chỉnh sửa tên công việc"
                        >
                        <div class="edit-actions">
                            <button type="button" class="btn btn-save" data-action="save" data-id="${task.id}" title="Lưu (Enter)">
                                <i class="fa-solid fa-check"></i>
                                <span>Lưu</span>
                            </button>
                            <button type="button" class="btn btn-cancel" data-action="cancel" title="Hủy (Esc)">
                                <i class="fa-solid fa-xmark"></i>
                                <span>Hủy</span>
                            </button>
                        </div>
                    </div>
                `;
            } else {
                // Chế độ hiển thị bình thường: Nút Sửa và Nút Xóa có đầy đủ icon + chữ
                li.innerHTML = `
                    <label class="task-checkbox-wrap" title="${task.completed ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}">
                        <input 
                            type="checkbox" 
                            class="task-checkbox" 
                            data-action="toggle" 
                            data-id="${task.id}"
                            ${task.completed ? 'checked' : ''}
                            aria-label="Đánh dấu hoàn thành công việc"
                        >
                    </label>
                    <div class="task-title-wrap">
                        <span class="task-title">${escapeHtml(task.title)}</span>
                    </div>
                    <div class="task-actions">
                        <button 
                            type="button" 
                            class="btn btn-edit" 
                            data-action="edit" 
                            data-id="${task.id}" 
                            title="Sửa công việc"
                            aria-label="Sửa công việc ${escapeHtml(task.title)}"
                        >
                            <i class="fa-solid fa-pen"></i>
                            <span>Sửa</span>
                        </button>
                        <button 
                            type="button" 
                            class="btn btn-delete" 
                            data-action="delete" 
                            data-id="${task.id}" 
                            title="Xóa công việc"
                            aria-label="Xóa công việc ${escapeHtml(task.title)}"
                        >
                            <i class="fa-solid fa-trash-can"></i>
                            <span>Xóa</span>
                        </button>
                    </div>
                `;
            }

            taskList.appendChild(li);
        });
    }

    // ==========================================
    // Event Listeners
    // ==========================================
    function setupEventListeners() {
        // Thêm bằng nút Thêm
        addBtn.addEventListener('click', handleAddTask);

        // Nhấn Enter trong ô input để thêm
        taskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTask();
            }
        });

        // Xóa thông báo lỗi khi người dùng bắt đầu gõ
        taskInput.addEventListener('input', () => {
            if (inputError && inputError.classList.contains('visible')) {
                clearError();
            }
        });

        // Event delegation cho danh sách công việc
        taskList.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id;

            if (action === 'toggle') {
                toggleComplete(id);
            } else if (action === 'edit') {
                startEdit(id);
            } else if (action === 'delete') {
                promptDelete(id);
            } else if (action === 'save') {
                saveEdit(id);
            } else if (action === 'cancel') {
                cancelEdit();
            }
        });

        // Xử lý bàn phím khi đang ở chế độ chỉnh sửa (Enter để Lưu, Escape để Hủy)
        taskList.addEventListener('keydown', (e) => {
            if (!editingTaskId) return;

            if (e.target.classList.contains('task-edit-input')) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveEdit(editingTaskId);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                }
            }
        });

        // Modal xác nhận xóa
        confirmDeleteBtn.addEventListener('click', confirmDelete);
        cancelDeleteBtn.addEventListener('click', closeDeleteModal);

        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                closeDeleteModal();
            }
        });

        // Đóng modal khi nhấn phím Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !deleteModal.classList.contains('hidden')) {
                closeDeleteModal();
            }
        });
    }

    // ==========================================
    // Khởi tạo ứng dụng
    // ==========================================
    function init() {
        setupEventListeners();
        render();
        taskInput.focus();
    }

    // Chạy khi DOM đã sẵn sàng
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
