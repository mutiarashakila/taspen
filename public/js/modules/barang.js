if (window.location.pathname === "/barang") {

    toastr.options = {
        closeButton: true,
        progressBar: true,
        positionClass: "toast-top-right",
        timeOut: 1000,
        preventDuplicates: true
    };

    $(document).ready(function () {
        $('#addBarangForm').submit(function (event) {
            event.preventDefault();
            var formData = new FormData(this);

            $.ajax({
                url: '/barang',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    if (response.success) {
                        toastr.success('Barang berhasil ditambahkan!', 'Sukses');
                        $('#addBarangForm')[0].reset();
                        setTimeout(function () {
                            location.reload();
                        }, 2000);
                    } else {
                        toastr.error('Gagal menambahkan barang: ' + response.message);
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Error:', error);
                    toastr.error('Terjadi kesalahan: ' + error);
                }
            });
        });
    });

    new Cleave('.input-harga', {
        numeral: true,
        numeralThousandsGroupStyle: 'thousand',
        prefix: 'Rp ',
        noImmediatePrefix: true
    });
    document.querySelector('form').addEventListener('submit', function (event) {
        const inputHarga = document.querySelector('.input-harga');
        const hargaValue = inputHarga.value;

        const cleanValue = hargaValue.replace(/[^0-9]/g, '');

        inputHarga.value = cleanValue;
    });
    function confirmDelete(idBarang) {
        $('#confirmDeleteModal').modal('show');
        $('#deleteConfirmBtn').on('click', function () {
            window.location.href = '/barang/delete/' + idBarang;
        });
    }
    const CONFIG = {
        MAX_IMAGE_SIZE: 10 * 1024 * 1024,
        DEFAULT_IMAGE_PATH: '/path/to/default-image.jpg',
        LOADING_IMAGE_PATH: '/path/to/loading.gif',
        API_ENDPOINTS: {
            DETAIL: (id) => `/barang/detail/${id}`,
            EDIT: '/barang/edit',
            UPDATE: '/update-barang'
        }
    };

    const Utils = {
        formatDateTimeLocal(dateString) {
            if (!dateString) return '';
            return new Date(dateString).toISOString().slice(0, 16);
        },

        formatDate(date) {
            return new Intl.DateTimeFormat('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(new Date(date));
        },

        showError(message) {
            toastr.error(message);
            console.error('Error:', message);
        },

        validateImageFile(file) {
            if (!file) return true;

            if (file.size > CONFIG.MAX_IMAGE_SIZE) {
                this.showError('Ukuran gambar terlalu besar. Maksimal 10MB');
                return false;
            }

            if (!file.type.match('image.*')) {
                this.showError('File harus berupa gambar');
                return false;
            }

            return true;
        }
    };

    class ImageHandler {
        constructor(previewElement, inputElement) {
            this.preview = $(previewElement);
            this.input = $(inputElement);
            this.setupEventListeners();
        }

        setupEventListeners() {
            this.input.on('change', (e) => this.handleImageChange(e));

            $('.image-upload-container')
                .on('click', () => this.input.click())
                .on('mouseenter', () => $('.image-upload-overlay').css('opacity', '1'))
                .on('mouseleave', () => $('.image-upload-overlay').css('opacity', '0'));
        }

        handleImageChange(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!Utils.validateImageFile(file)) {
                event.target.value = '';
                return;
            }

            this.showLoadingState();
            this.readAndPreviewImage(file);
        }

        showLoadingState() {
            this.preview.attr('src', CONFIG.LOADING_IMAGE_PATH);
        }

        readAndPreviewImage(file) {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.preview
                        .attr('src', e.target.result)
                        .addClass('preview-image');
                };
                img.src = e.target.result;
            };

            reader.onerror = () => {
                Utils.showError('Gagal membaca file gambar');
                this.preview
                    .attr('src', CONFIG.DEFAULT_IMAGE_PATH)
                    .addClass('preview-image');
            };

            reader.readAsDataURL(file);
        }

        setPreviewImage(base64Image) {
            if (!base64Image) {
                this.preview.attr('src', CONFIG.DEFAULT_IMAGE_PATH);
                return;
            }

            const img = new Image();
            img.onload = () => {
                this.preview
                    .attr('src', img.src)
                    .addClass('preview-image');
            };
            img.onerror = () => {
                this.preview
                    .attr('src', CONFIG.DEFAULT_IMAGE_PATH)
                    .addClass('preview-image');
            };
            img.src = `data:image/jpeg;base64,${base64Image}`;
        }
    }

    class BarangFormHandler {
        constructor() {
            this.form = $('#editBarangForm');
            this.imageHandler = new ImageHandler('#previewImage', '#gambar_barang');
            this.setupFormElements();
            this.setupEventListeners();
        }

        setupFormElements() {
            this.hargaInput = new Cleave('.input-harga', {
                numeral: true,
                numeralThousandsGroupStyle: 'thousand',
                prefix: 'Rp ',
                numeralDecimalScale: 0
            });

            this.statusSelect = $('#status_barang');
            this.lelangSection = $('#lelangSection');
        }

        setupEventListeners() {
            this.statusSelect.on('change', () => this.handleStatusChange());
            this.form.on('submit', (e) => this.handleSubmit(e));
        }

        handleStatusChange() {
            const isLelang = this.statusSelect.val() === 'lelang';
            this.lelangSection.toggleClass('d-none', !isLelang);

            if (!isLelang) {
                $('#waktu_mulai, #waktu_selesai').val('');
            }
        }

        async handleSubmit(e) {
            e.preventDefault();

            try {
                const formData = new FormData(this.form[0]);

                const hargaValue = this.hargaInput.getRawValue();
                formData.set('harga_barang', hargaValue);

                if (!formData.get('nama_barang')) {
                    throw new Error('Nama barang harus diisi');
                }

                const gambarFile = $('#gambar_barang')[0].files[0];
                if (gambarFile && !Utils.validateImageFile(gambarFile)) {
                    return;
                }

                const response = await $.ajax({
                    url: CONFIG.API_ENDPOINTS.EDIT,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false
                });

                if (response.success) {
                    toastr.success('Barang berhasil diperbarui!');
                    $('#editBarangModal').modal('hide');

                    if (typeof loadBarangTable === 'function') {
                        loadBarangTable();
                    }
                } else {
                    throw new Error(response.message || 'Gagal memperbarui barang');
                }
            } catch (error) {
                console.error('Error submitting form:', error);
            }
        }

        populateForm(barang) {
            this.form[0].reset();

            $('#editBarangModalLabel').text(`Edit Detail Barang - ${barang.nama_barang}`);
            $('#id_barang').val(barang.id_barang);
            $('#nama_barang').val(barang.nama_barang);
            $('#deskripsi_barang').val(barang.deskripsi_barang);
            $('#kategori').val(barang.kategori);
            $('#lokasi_barang').val(barang.lokasi_barang);
            $('#status_barang').val(barang.status_barang);
            $('#id_karyawan').val(barang.id_karyawan);
            $('#kondisi_barang').val(barang.kondisi_barang);

            this.hargaInput.setRawValue(barang.harga_barang);

            if (barang.tanggal_perolehan) {
                $('#tanggal_perolehan').val(Utils.formatDate(barang.tanggal_perolehan));
            }

            this.handleLelangSection(barang);

            this.imageHandler.setPreviewImage(barang.gambar_barang);
        }

        handleLelangSection(barang) {
            const isLelang = barang.status_barang === 'lelang';
            this.lelangSection.toggleClass('d-none', !isLelang);

            if (isLelang) {
                $('#waktu_mulai').val(Utils.formatDateTimeLocal(barang.waktu_mulai));
                $('#waktu_selesai').val(Utils.formatDateTimeLocal(barang.waktu_selesai));
            }
        }
    }

    const formHandler = new BarangFormHandler();

    function setupCleave() {
        new Cleave('#harga_barang', {
            numeral: true,
            numeralThousandsGroupStyle: 'thousand',
            prefix: 'Rp ',
            numeralDecimalScale: 0
        });
    }

    function getBarangDetail(id_barang) {
        $.ajax({
            url: `/barang/detail/${id_barang}`,
            type: 'GET',
            success: function (response) {
                if (response.success) {
                    $('#editBarangForm')[0].reset();


                    const barang = response.data;
                    $('#id_barang').val(barang.id_barang);
                    $('#nama_barang').val(barang.nama_barang);
                    $('#deskripsi_barang').val(barang.deskripsi_barang);
                    $('#kategori').val(barang.kategori);
                    $('#lokasi_barang').val(barang.lokasi_barang);
                    $('#harga_barang').val(barang.harga_barang);
                    $('#status_barang').val(barang.status_barang);
                    $('#pemilikBarang').val(barang.id_karyawan);
                    $('#kondisi_barang').val(barang.kondisi_barang);

                    $('#id_display').text(barang.id_barang);
                    $('#nama_display').text(barang.nama_barang);

                    if (barang.status_barang === 'proses') {
                        window.location.href = `/lelang`;
                    }


                    if (barang.waktu_masuk) {
                        $('#waktu_masuk').text(new Date(barang.waktu_masuk).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }));
                    }


                    if (barang.gambar_barang) {
                        $('#previewImage').attr('src', `data:image/jpeg;base64,${barang.gambar_barang}`);
                    }
                    setupCleave();

                    $('#editBarangModal').modal('show');
                } else {
                    toastr.error('Gagal mengambil data barang: ' + response.message);
                }
            },
            error: function (xhr, status, error) {
                toastr.error('Terjadi kesalahan saat mengambil data barang');
            }
        });
    }
    function formatTimeRemaining(startTime, endTime) {
        if (!startTime || !endTime) return '-';

        const now = new Date();
        const end = new Date(endTime);

        if (now >= end) return 'Selesai';

        const diff = end - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${days}h${hours}j${minutes}m${seconds}d`;
    }

    function getStatusClass(status) {
        switch (status) {
            case 'tersedia': return 'bg-success';
            case 'lelang': return 'bg-warning';
            case 'jual': return 'bg-danger';
            case 'proses': return 'bg-primary';
            default: return 'bg-secondary';
        }
    }

    function getStatusText(status) {
        switch (status) {
            case 'tersedia': return 'Tersedia';
            case 'lelang': return 'Menunggu';
            case 'jual': return 'Jual';
            case 'proses': return 'Sedang Lelang';
            default: return 'Tidak Diketahui';
        }
    }

    function updateTableRow(item) {
        const row = document.querySelector(`tr[data-id="${item.id_barang}"]`);
        if (!row) return;

        const statusClass = getStatusClass(item.status_barang);
        const statusText = getStatusText(item.status_barang);

        row.innerHTML = `
            <td class="px-4 py-3 text-center">${item.id_barang}</td>
            <td class="px-4 py-3 text-sm font-medium">${item.nama_barang}</td>
            <td class="px-4 py-3 text-sm">${item.kategori}</td>
            <td class="px-4 py-3 text-sm">${item.lokasi_barang}</td>
            <td class="px-4 py-3 text-sm">${item.nama_karyawan || '-'}</td>
            <td class="px-4 py-3 text-sm text-center" 
                id="timer-${item.id_barang}"
                data-start-time="${item.waktu_mulai || ''}"
                data-end-time="${item.waktu_selesai || ''}">
                ${formatTimeRemaining(item.waktu_mulai, item.waktu_selesai)}
            </td>
            <td class="px-4 py-3 text-center">
                <span class="badge ${statusClass} text-white px-3 py-1 rounded-pill">
                    ${statusText}
                </span>
            </td>
            <td class="px-4 py-3 text-center">
                <div class="btn-group" role="group">
                    <button class="btn btn-white btn-sm" 
                        data-bs-toggle="modal"
                        data-bs-target="#editBarangModal"
                        title="Edit"
                        onclick="getBarangDetail('${item.id_barang}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <button class="btn btn-danger btn-sm"
                        data-bs-toggle="popup"
                        title="Hapus"
                        onclick="confirmDelete('${item.id_barang}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
    }

    function updateTable() {
        const urlParams = new URLSearchParams(window.location.search);
        const currentPage = urlParams.get('page') || 1;
        const sort = urlParams.get('sort') || '';
        const order = urlParams.get('order') || '';
        const limit = urlParams.get('limit') || '';
        const search = urlParams.get('search') || '';

        const tableBody = document.querySelector('tbody');
        if (tableBody) {
            tableBody.style.opacity = '0.5';
        }

        $.ajax({
            url: '/barang/refresh',
            type: 'GET',
            data: {
                page: currentPage,
                sort: sort,
                order: order,
                limit: limit,
                search: search
            },
            success: function (response) {
                if (response.success) {
                    if (tableBody) {
                        tableBody.innerHTML = '';
                        response.barang.forEach(item => {
                            tableBody.innerHTML += generateTableRow(item);
                        });
                        tableBody.style.opacity = '1';
                    }
                    initializeTimers();
                    updateSortingIndicators(sort, order);
                    if (response.pagination) {
                        updatePagination(response.pagination);
                    }
                }
            },
            error: function (xhr, status, error) {
                console.error('Error:', error);
                toastr.error('Gagal memperbarui tabel');
                if (tableBody) {
                    tableBody.style.opacity = '1';
                }
            }
        });
    }

    function generateTableRow(item) {
        const statusClass = getStatusClass(item.status_barang);
        const statusText = getStatusText(item.status_barang);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = new Date(item.waktu_masuk).toLocaleDateString('id-ID', options);

        return `
            <tr data-id="${item.id_barang}">
            <td class="px-4 py-3">${formattedDate}</td>
                <td class="px-4 py-3 text-center">${item.id_barang}</td>
                <td class="px-4 py-3 text-sm font-medium">${item.nama_barang}</td>
                <td class="px-4 py-3 text-sm">${item.kategori}</td>
                <td class="px-4 py-3 text-sm">${item.lokasi_barang}</td>
                <td class="px-4 py-3 text-sm">${item.nama_karyawan || '-'}</td>
                <td class="px-4 py-3 text-sm text-center" 
                    id="timer-${item.id_barang}"
                    data-start-time="${item.waktu_mulai || ''}"
                    data-end-time="${item.waktu_selesai || ''}">
                    ${formatTimeRemaining(item.waktu_mulai, item.waktu_selesai)}
                </td>
                <td class="px-4 py-3 text-center">
                    <span class="badge ${statusClass} text-white px-3 py-1 rounded-pill">
                        ${statusText}
                    </span>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="btn-group" role="group">
                        <button class="btn btn-white btn-sm" 
                            onclick="getBarangDetail('${item.id_barang}')"
                            title="Edit">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <button class="btn btn-danger btn-sm"
                            onclick="confirmDelete('${item.id_barang}')"
                            title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    document.addEventListener('DOMContentLoaded', function () {
        function initializeSorting() {
            const tableHeaders = document.querySelectorAll('th.sortable');

            tableHeaders.forEach(header => {
                header.removeEventListener('click', handleHeaderClick);
                header.addEventListener('click', handleHeaderClick);
                header.style.cursor = 'pointer';
            });
        }

        function handleHeaderClick(event) {
            const header = event.currentTarget;
            const field = header.dataset.field;
            const currentSort = header.dataset.currentSort;
            const currentOrder = header.dataset.currentOrder;

            let newOrder = 'ASC';
            if (field === currentSort && currentOrder === 'ASC') {
                newOrder = 'DESC';
            }

            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('sort', field);
            urlParams.set('order', newOrder);
            urlParams.set('page', '1');

            const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
            history.pushState({}, '', newUrl);

            updateSortingIndicators(field, newOrder);

            updateTable();
        }

        function updateSortingIndicators(sortField, sortOrder) {
            const headers = document.querySelectorAll('th.sortable');

            headers.forEach(header => {
                const field = header.dataset.field;
                const iconElement = header.querySelector('i.fas');

                iconElement?.classList.remove('fa-sort', 'fa-sort-up', 'fa-sort-down');

                if (field === sortField) {
                    iconElement?.classList.add(sortOrder === 'ASC' ? 'fa-sort-up' : 'fa-sort-down');
                    header.dataset.currentSort = sortField;
                    header.dataset.currentOrder = sortOrder;
                } else {
                    iconElement?.classList.add('fa-sort');
                }
            });
        }
        initializeSorting();

        document.addEventListener('tableUpdated', function () {
            initializeSorting();
        });

        const originalUpdateTable = window.updateTable;
        window.updateTable = function () {
            originalUpdateTable.call(this, ...arguments);
            document.dispatchEvent(new CustomEvent('tableUpdated'));
        };
    });

    function updatePagination(paginationData) {
        const paginationContainer = document.querySelector('.pagination');
        if (!paginationContainer) return;
        let paginationHtml = '';

        paginationHtml += `
            <li class="page-item ${paginationData.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${paginationData.currentPage - 1}">Previous</a>
            </li>
        `;

        for (let i = 1; i <= paginationData.totalPages; i++) {
            paginationHtml += `
                <li class="page-item ${i === paginationData.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        paginationHtml += `
            <li class="page-item ${paginationData.currentPage === paginationData.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${paginationData.currentPage + 1}">Next</a>
            </li>
        `;
        paginationContainer.innerHTML = paginationHtml;

        paginationContainer.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const page = this.dataset.page;
                if (page) {
                    const urlParams = new URLSearchParams(window.location.search);
                    urlParams.set('page', page);
                    history.pushState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
                    updateTable();
                }
            });
        });
    }

    $('#editBarangForm').on('submit', function (e) {
        e.preventDefault();

        const formData = new FormData(this);
        const hargaValue = $('#harga_barang').val().replace(/[^0-9]/g, '');
        formData.set('harga_barang', hargaValue);

        const submitBtn = $(this).find('button[type="submit"]');
        submitBtn.prop('disabled', true).html('Menyimpan...');

        $.ajax({
            url: '/barang/edit',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                if (response.success) {
                    toastr.success('Barang berhasil diperbarui!', 'Sukses');
                    $('#editBarangModal').modal('hide');
                    setTimeout(function () {
                        updateTable();
                    }, 2000);
                } else {
                    toastr.error('Gagal memperbarui barang: ' + response.message);
                }
            },
            error: function (xhr, status, error) {
                console.error('Error:', error);
                console.error('Response:', xhr.responseText);
                toastr.error('Terjadi kesalahan saat memperbarui data');
            },
            complete: function () {
                submitBtn.prop('disabled', false).html('Simpan');
            }
        });
    });

    let timerInterval;

    function initializeTimers() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        const updateAllTimers = () => {
            const timerElements = document.querySelectorAll('[id^="timer-"]');
            timerElements.forEach(timerEl => {
                const id_barang = timerEl.id.split('-')[1];
                const startTimeStr = timerEl.getAttribute('data-start-time');
                const endTimeStr = timerEl.getAttribute('data-end-time');
                const status = $(`tr[data-id="${id_barang}"] .badge`).text().trim();

                if (startTimeStr && endTimeStr && status === 'Sedang Lelang') {
                    timerEl.textContent = formatTimeRemaining(startTimeStr, endTimeStr);
                } else {
                    timerEl.textContent = '-';
                }
            });
        };

        timerInterval = setInterval(updateAllTimers, 1000);
        updateAllTimers();
    }

    $(document).ready(function () {
        updateTable();
        initializeTimers();
    });

    document.addEventListener('DOMContentLoaded', function () {
        const printBtn = document.getElementById('printBtn');
        if (printBtn) {
            printBtn.addEventListener('click', function () {
                printBtn.disabled = true;
                printBtn.textContent = 'Mengunduh...';

                fetch('laporan/print')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.blob();
                    })
                    .then(blob => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = 'INVENTAS_BARANG.xlsx';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('Gagal mengunduh file Excel');
                    })
                    .finally(() => {
                        printBtn.disabled = false;
                        printBtn.textContent = 'Unduh Excel';
                    });
            });
        }
    });

    function changeEntries(value) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('limit', value);
        urlParams.set('page', '1');

        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.location.href = newUrl;
    }


    function sortTable(field, order) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('sort', field);
        urlParams.set('order', order);
        urlParams.set('page', '1');

        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.location.href = newUrl;
    }

    function sortByDate(order) {
        sortTable('waktu_masuk', order);
    }

    document.addEventListener('DOMContentLoaded', function () {
        const paginationLinks = document.querySelectorAll('.pagination .page-link');

        paginationLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();

                if (this.href && !this.href.includes('#')) {
                    const url = new URL(this.href);
                    const urlParams = new URLSearchParams(url.search);

                    history.pushState({}, '', `${url.pathname}?${urlParams.toString()}`);

                    updateTable();
                }
            });
        });

    });
}
