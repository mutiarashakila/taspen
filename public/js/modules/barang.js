if (window.location.pathname === "/barang") {
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
                        toastr.success('Barang berhasil ditambahkan!');
                        $('#addBarangForm')[0].reset();
                        location.reload();
                    } else {
                        toastr.error('Gagal menambahkan barang: ' + response.message);
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Error:', error);
                    alert('Terjadi kesalahan: ' + error);
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
        const currentPage = new URLSearchParams(window.location.search).get('page') || 1;

        $.ajax({
            url: `/barang/refresh?page=${currentPage}`,
            type: 'GET',
            success: function (response) {
                if (response.success) {
                    response.barang.forEach(item => {
                        updateTableRow(item);
                    });
                    initializeTimers();
                }
            },
            error: function (xhr, status, error) {
                console.error('Error:', error);
                toastr.error('Gagal memperbarui tabel');
            }
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
                    toastr.success('Barang berhasil diperbarui!');
                    $('#editBarangModal').modal('hide');
                    updateTable();
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

document.addEventListener('DOMContentLoaded', function() {
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', function() {
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
}
